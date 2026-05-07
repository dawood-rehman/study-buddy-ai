"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe2, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { GeneratedContent } from "@/components/GeneratedContent";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAiStream } from "@/lib/ai-client";

type MapPlace = {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  keywords: string[];
};

type LeafletMap = {
  setView: (latLng: [number, number], zoom?: number, options?: Record<string, unknown>) => void;
  on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  invalidateSize: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string) => LeafletMarker;
  on: (event: string, handler: (event?: { originalEvent?: Event }) => void) => LeafletMarker;
  setLatLng: (latLng: [number, number]) => LeafletMarker;
  setPopupContent: (content: string) => LeafletMarker;
  remove: () => void;
};

type LeafletTileLayer = {
  addTo: (map: LeafletMap) => void;
};

type LeafletApi = {
  map: (element: HTMLDivElement, options?: Record<string, unknown>) => LeafletMap;
  marker: (latLng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletTileLayer;
};

declare global {
  interface Window {
    L?: LeafletApi;
    __studyBuddyLeaflet?: Promise<LeafletApi>;
  }
}

const mapPlaces: MapPlace[] = [
  { name: "Pakistan", region: "South Asia", latitude: 30.4, longitude: 69.3, keywords: ["pakistan", "islamabad", "lahore", "karachi"] },
  { name: "India", region: "South Asia", latitude: 22.9, longitude: 78.7, keywords: ["india", "delhi", "mumbai"] },
  { name: "Saudi Arabia", region: "Middle East", latitude: 23.9, longitude: 45.1, keywords: ["saudi", "arabia", "riyadh", "makkah", "madina"] },
  { name: "Iran", region: "Middle East", latitude: 32.4, longitude: 53.7, keywords: ["iran", "tehran", "persia"] },
  { name: "United Arab Emirates", region: "Middle East", latitude: 24.4, longitude: 54.4, keywords: ["uae", "dubai", "abu dhabi", "emirates"] },
  { name: "Palestine", region: "Middle East", latitude: 31.9, longitude: 35.2, keywords: ["palestine", "jerusalem", "gaza"] },
  { name: "Jordan", region: "Middle East", latitude: 31.2, longitude: 36.5, keywords: ["jordan", "amman", "petra"] },
  { name: "Syria", region: "Middle East", latitude: 35.0, longitude: 38.5, keywords: ["syria", "damascus"] },
  { name: "China", region: "East Asia", latitude: 35.9, longitude: 104.2, keywords: ["china", "beijing", "shanghai"] },
  { name: "South Korea", region: "East Asia", latitude: 36.5, longitude: 127.8, keywords: ["korea", "seoul", "south korea"] },
  { name: "Japan", region: "East Asia", latitude: 37.5, longitude: 138.2, keywords: ["japan", "tokyo", "kyoto"] },
  { name: "Germany", region: "Europe", latitude: 51.2, longitude: 10.4, keywords: ["germany", "berlin", "munich"] },
  { name: "United Kingdom", region: "Europe", latitude: 55.4, longitude: -3.4, keywords: ["uk", "united kingdom", "britain", "london"] },
  { name: "France", region: "Europe", latitude: 46.2, longitude: 2.2, keywords: ["france", "paris"] },
  { name: "Italy", region: "Europe", latitude: 42.8, longitude: 12.5, keywords: ["italy", "rome", "florence"] },
  { name: "Egypt", region: "North Africa", latitude: 26.8, longitude: 30.8, keywords: ["egypt", "cairo", "pyramids"] },
  { name: "United States", region: "North America", latitude: 39.8, longitude: -98.6, keywords: ["usa", "america", "united states", "washington", "new york"] },
  { name: "Brazil", region: "South America", latitude: -14.2, longitude: -51.9, keywords: ["brazil", "rio", "sao paulo"] },
  { name: "South Africa", region: "Africa", latitude: -30.6, longitude: 22.9, keywords: ["south africa", "cape town", "johannesburg"] },
  { name: "Australia", region: "Oceania", latitude: -25.3, longitude: 133.8, keywords: ["australia", "sydney", "melbourne"] },
];

function findPlace(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const exact = mapPlaces.find((place) => place.name.toLowerCase().includes(normalized) || place.keywords.some((keyword) => keyword.includes(normalized)));
  if (exact) return exact;

  return findFuzzyPlace(normalized);
}

function levenshteinDistance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);

  for (let column = 1; column <= b.length; column += 1) {
    rows[0][column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + cost,
      );
    }
  }

  return rows[a.length][b.length];
}

function findFuzzyPlace(query: string) {
  const candidates = mapPlaces.flatMap((place) => [place.name.toLowerCase(), ...place.keywords].map((keyword) => ({ place, keyword })));
  const ranked = candidates
    .map((candidate) => ({ ...candidate, distance: levenshteinDistance(query, candidate.keyword) }))
    .sort((a, b) => a.distance - b.distance);
  const best = ranked[0];

  if (!best) return null;

  const maxDistance = query.length <= 5 ? 1 : query.length <= 9 ? 2 : 3;
  return best.distance <= maxDistance ? best.place : null;
}

function getReportKey(place: MapPlace, focus?: string) {
  const locationKey = [
    place.name.trim().toLowerCase(),
    place.region.trim().toLowerCase(),
    place.latitude.toFixed(3),
    place.longitude.toFixed(3),
  ].join("|");
  return `${locationKey}|${(focus || "").trim().toLowerCase()}`;
}

function loadLeaflet() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Map can only load in the browser."));
  }

  if (window.L) return Promise.resolve(window.L);
  if (window.__studyBuddyLeaflet) return window.__studyBuddyLeaflet;

  window.__studyBuddyLeaflet = new Promise<LeafletApi>((resolveLeaflet, rejectLeaflet) => {
    if (!document.querySelector("link[data-study-buddy-leaflet]")) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      stylesheet.dataset.studyBuddyLeaflet = "true";
      document.head.appendChild(stylesheet);
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-study-buddy-leaflet]");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolveLeaflet(window.L as LeafletApi), { once: true });
      existingScript.addEventListener("error", () => rejectLeaflet(new Error("Leaflet map engine failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.studyBuddyLeaflet = "true";
    script.onload = () => window.L ? resolveLeaflet(window.L) : rejectLeaflet(new Error("Leaflet map engine unavailable."));
    script.onerror = () => rejectLeaflet(new Error("Leaflet map engine failed to load."));
    document.body.appendChild(script);
  });

  return window.__studyBuddyLeaflet;
}

export default function EarthMapPage() {
  const [query, setQuery] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<MapPlace>(mapPlaces[0]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const focusMarkerRef = useRef<LeafletMarker | null>(null);
  const placeMarkersRef = useRef<LeafletMarker[]>([]);
  const explorePlaceRef = useRef<(place: MapPlace, focus?: string, shouldGenerate?: boolean) => void>(() => undefined);
  const generationIdRef = useRef(0);
  const reportCacheRef = useRef<Map<string, string>>(new Map());
  const isAiLoadingRef = useRef(false);

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mapPlaces.slice(0, 8);
    return mapPlaces.filter((place) => place.name.toLowerCase().includes(normalized) || place.keywords.some((keyword) => keyword.includes(normalized))).slice(0, 8);
  }, [query]);

  const focusMap = async (place: MapPlace, zoom = 6) => {
    const leaflet = await loadLeaflet();
    const map = leafletMapRef.current;
    if (!map) return;

    map.setView([place.latitude, place.longitude], zoom, { animate: true, duration: 0.7 });

    if (!focusMarkerRef.current) {
      focusMarkerRef.current = leaflet.marker([place.latitude, place.longitude], { bubblingMouseEvents: false }).addTo(map).bindPopup(place.name);
    } else {
      focusMarkerRef.current.setLatLng([place.latitude, place.longitude]).setPopupContent(place.name);
    }
  };

  const explorePlace = async (place: MapPlace, focus = customFocus, shouldGenerate = true) => {
    const generationId = generationIdRef.current + 1;
    setSelectedPlace(place);
    void focusMap(place, place.region === "Custom location" ? 11 : 5);

    if (!shouldGenerate) return;

    const reportKey = getReportKey(place, focus);
    const cachedReport = reportCacheRef.current.get(reportKey);

    if (cachedReport) {
      generationIdRef.current = generationId;
      setResponse(cachedReport);
      setIsLoading(false);
      toast.success("Cached location report loaded");
      return;
    }

    if (isAiLoadingRef.current) {
      toast.info("AI report is already generating", {
        description: "Please wait a moment, then select the next location.",
      });
      return;
    }

    generationIdRef.current = generationId;
    isAiLoadingRef.current = true;
    setResponse(null);
    setIsLoading(true);

    try {
      const result = await requestAiStream({
        task: "study",
        language: "english",
        prompt: [
          `Create an AI world knowledge explorer brief for ${place.name}, ${place.region}.`,
          focus ? `User focus: ${focus}` : "Cover the full location profile.",
          "Detect the location level from the place name and region: country, province/state, city, town, landmark, or coordinates. Give the report at that exact level.",
          "If this is a city, focus on city-level history, neighborhoods/important places, local culture, economy, tourism, transport, and current importance.",
          "If this is a country, focus on country-level history, culture, geography, politics, major cities, tourism, and important national facts.",
          "Include only relevant, location-specific information.",
          "Sections: General Info, Historical Importance, Famous Places, Culture & Traditions, Geography, Politics, Tourist Attractions, Interesting Facts, Important Events.",
          "Keep it concise but detailed enough for students and travelers.",
        ].join("\n"),
        options: { mode: "earth-map-explorer", place: place.name, region: place.region, focus, latitude: place.latitude, longitude: place.longitude },
      }, {
        onContent: (content) => {
          if (generationIdRef.current === generationId) setResponse(content);
        },
      });

      if (generationIdRef.current !== generationId) return;

      setResponse(result.content);
      reportCacheRef.current.set(reportKey, result.content);
      toast.success("Location guide ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      if (generationIdRef.current !== generationId) return;
      toast.error("Map AI failed", {
        description: getErrorMessage(error),
      });
    } finally {
      isAiLoadingRef.current = false;
      if (generationIdRef.current === generationId) {
        setIsLoading(false);
      }
    }
  };

  explorePlaceRef.current = (place, focus, shouldGenerate) => {
    void explorePlace(place, focus, shouldGenerate);
  };

  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((leaflet) => {
      if (!isMounted || !mapContainerRef.current || leafletMapRef.current) return;

      const map = leaflet.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        worldCopyJump: true,
      });
      leafletMapRef.current = map;
      map.setView([24.8, 54.8], 3);

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      placeMarkersRef.current = mapPlaces.map((place) => (
        leaflet.marker([place.latitude, place.longitude], { bubblingMouseEvents: false })
          .addTo(map)
          .bindPopup(`${place.name}<br>${place.region}`)
          .on("click", (markerEvent) => {
            markerEvent?.originalEvent?.stopPropagation();
            explorePlaceRef.current(place, undefined, true);
          })
      ));

      map.on("click", (event) => {
        const place: MapPlace = {
          name: "Finding place name...",
          region: `${event.latlng.lat.toFixed(3)}, ${event.latlng.lng.toFixed(3)}`,
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
          keywords: [],
        };
        explorePlaceRef.current(place, undefined, false);
        reverseGeocodePlace(event.latlng.lat, event.latlng.lng)
          .then((resolvedPlace) => explorePlaceRef.current(resolvedPlace, undefined, true))
          .catch(() => explorePlaceRef.current({
            ...place,
            name: `Selected Location (${event.latlng.lat.toFixed(3)}, ${event.latlng.lng.toFixed(3)})`,
          }, undefined, true));
      });

      setIsMapLoading(false);
      window.setTimeout(() => map.invalidateSize(), 100);
    }).catch((error) => {
      if (!isMounted) return;
      setIsMapLoading(false);
      toast.error("Map failed to load", {
        description: error instanceof Error ? error.message : "Please check the connection.",
      });
    });

    return () => {
      isMounted = false;
      placeMarkersRef.current.forEach((marker) => marker.remove());
      focusMarkerRef.current?.remove();
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      focusMarkerRef.current = null;
      placeMarkersRef.current = [];
    };
  }, []);

  const searchOnlinePlace = async (term: string) => {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(term)}`, {
      headers: {
        Accept: "application/json",
      },
    });
    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;

    if (!first?.lat || !first?.lon) return null;

    return {
      name: first.name || first.display_name?.split(",")[0] || term,
      region: first.display_name || "Searched location",
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      keywords: [term.toLowerCase()],
    } satisfies MapPlace;
  };

  const reverseGeocodePlace = async (latitude: number, longitude: number) => {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&addressdetails=1&lat=${latitude}&lon=${longitude}`, {
      headers: { Accept: "application/json" },
    });
    const result = await response.json();
    const address = result?.address || {};
    const name = result?.name || address.city || address.town || address.village || address.state || address.country || "Selected Location";
    const region = result?.display_name || [address.state, address.country].filter(Boolean).join(", ") || "Custom location";

    return {
      name,
      region,
      latitude,
      longitude,
      keywords: [name.toLowerCase()],
    } satisfies MapPlace;
  };

  const handleSearchExplore = async () => {
    const term = query.trim();

    if (!term) {
      toast.error("Search or click a place on the map first.");
      return;
    }

    const localPlace = findPlace(term);

    if (localPlace) {
      void explorePlace(localPlace);
      return;
    }

    setIsSearching(true);
    try {
      const searchedPlace = await searchOnlinePlace(term);

      if (!searchedPlace) {
        toast.error("Location not found", {
          description: "Try a country, city, landmark, or region name.",
        });
        return;
      }

      await explorePlace(searchedPlace, customFocus, true);
    } catch (error) {
      toast.error("Location search failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AuthGate title="Login required for AI Earth Map" description="Login to explore the interactive world map and generate AI location guides.">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader icon={Globe2} title="AI Earth Map" description="Explore a real interactive world map with AI location knowledge down to city level" />

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="glass-card p-4 sm:p-5">
            <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleSearchExplore();
                  }}
                  placeholder="Search city, country, landmark, region..."
                  className="pl-10"
                />
              </div>
              <Button className="gradient-primary w-full border-0 lg:w-auto" onClick={() => void handleSearchExplore()} disabled={isLoading || isSearching}>
                {isLoading || isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Explore
              </Button>
            </div>

            <div className="mb-4 rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Selected place</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">{selectedPlace.name}</p>
              <p className="text-sm text-muted-foreground">{selectedPlace.region}</p>
            </div>

            <div className="relative min-h-[430px] overflow-hidden rounded-md border border-border bg-muted sm:min-h-[560px]">
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />
              {isMapLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : null}
              <div className="absolute bottom-3 left-3 right-3 z-[500] grid max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:bottom-4 sm:left-4 sm:right-4 sm:grid-cols-2 md:grid-cols-4">
                {filteredPlaces.map((place) => (
                  <button key={`quick-${place.name}`} onClick={() => void explorePlace(place)} className="rounded-md border border-border bg-background/95 px-3 py-2 text-left text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-background">
                    {place.name}
                    <span className="block text-[11px] font-normal text-muted-foreground">{place.region}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="glass-card p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">{selectedPlace.name}</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-muted-foreground">{selectedPlace.region}</p>
              <Textarea
                value={customFocus}
                onChange={(event) => setCustomFocus(event.target.value)}
                placeholder="Optional focus: history, politics, tourism, Islamic history, culture, famous places..."
                className="min-h-[120px]"
              />
              <Button className="mt-3 w-full" variant="outline" onClick={() => void explorePlace(selectedPlace)} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate AI Guide
              </Button>
            </section>

            <section className="glass-card p-4 sm:p-5">
              {isLoading ? (
                <div className="flex min-h-[320px] items-center justify-center text-center">
                  <div>
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                    <p className="font-medium text-foreground">Generating report for {selectedPlace.name}</p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">AI is preparing location details, history, culture, geography, politics, tourism, and key facts.</p>
                  </div>
                </div>
              ) : response ? (
                <GeneratedContent content={response} title={`${selectedPlace.name} AI Guide`} type="study" />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center text-center">
                  <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                    Pan, zoom, search, or click a location on the real map. The AI report will generate automatically for countries, cities, landmarks, or selected coordinates.
                  </p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
