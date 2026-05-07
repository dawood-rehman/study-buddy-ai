"use client";

import { useMemo, useState } from "react";
import { Globe2, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { GeneratedContent } from "@/components/GeneratedContent";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";

type MapPlace = {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  keywords: string[];
};

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

const landPaths = [
  "M160 102L188 78L234 60L282 76L318 100L335 139L321 180L285 208L247 215L222 243L188 247L155 224L124 205L98 165L115 128Z",
  "M284 222L317 238L337 272L329 322L303 376L286 430L259 454L238 418L222 362L203 329L208 283L235 246Z",
  "M458 92L512 65L579 70L630 94L657 124L650 164L614 186L563 174L526 192L476 173L442 136Z",
  "M606 104L676 92L744 105L816 132L874 166L911 213L886 251L816 258L762 235L705 243L656 222L620 183L585 170L596 132Z",
  "M514 205L558 202L596 234L619 286L607 350L576 414L537 401L508 350L488 296L472 244Z",
  "M735 274L784 283L816 319L809 360L760 367L714 344L702 305Z",
  "M324 46L355 28L393 36L405 69L377 92L336 82Z",
  "M73 456L179 444L314 449L457 441L612 449L780 439L930 451L907 481L114 482Z",
  "M420 156L444 160L452 183L431 194L409 181Z",
  "M887 247L914 253L931 274L912 294L879 286L866 264Z",
];

function projectPlace(place: MapPlace) {
  return {
    x: ((place.longitude + 180) / 360) * 100,
    y: ((90 - place.latitude) / 180) * 100,
  };
}

function findPlace(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  return mapPlaces.find((place) => place.name.toLowerCase().includes(normalized) || place.keywords.some((keyword) => keyword.includes(normalized))) || null;
}

export default function EarthMapPage() {
  const [query, setQuery] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<MapPlace>(mapPlaces[0]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mapPlaces.slice(0, 8);
    return mapPlaces.filter((place) => place.name.toLowerCase().includes(normalized) || place.keywords.some((keyword) => keyword.includes(normalized))).slice(0, 8);
  }, [query]);

  const explorePlace = async (place: MapPlace, focus = customFocus) => {
    setSelectedPlace(place);
    setIsLoading(true);

    try {
      const result = await requestAi({
        task: "study",
        language: "english",
        prompt: [
          `Create an AI world knowledge explorer brief for ${place.name}, ${place.region}.`,
          focus ? `User focus: ${focus}` : "Cover the full location profile.",
          "Include only relevant, location-specific information.",
          "Sections: General Info, Historical Importance, Famous Places, Culture & Traditions, Geography, Politics, Tourist Attractions, Interesting Facts, Important Events.",
          "Keep it concise but detailed enough for students and travelers.",
        ].join("\n"),
        options: { mode: "earth-map-explorer", place: place.name, region: place.region, focus },
      });

      setResponse(result.content);
      toast.success("Location guide ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Map AI failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchExplore = () => {
    const place = findPlace(query);

    if (place) {
      void explorePlace(place);
      return;
    }

    if (!query.trim()) {
      toast.error("Search or click a place on the map first.");
      return;
    }

    void explorePlace({
      name: query.trim(),
      region: "Custom location",
      latitude: 0,
      longitude: 0,
      keywords: [query.trim().toLowerCase()],
    });
  };

  return (
    <AuthGate title="Login required for AI Earth Map" description="Login to explore the interactive world map and generate AI location guides.">
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader icon={Globe2} title="AI Earth Map" description="Explore countries, cities, culture, history, politics, geography, tourism, and world knowledge" />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="glass-card p-5">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Pakistan, India, Germany, Saudi Arabia, USA, China, Palestine..." className="pl-10" />
            </div>
            <Button className="gradient-primary border-0" onClick={handleSearchExplore} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Explore
            </Button>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-md border border-border bg-[#d8eef7]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 500" role="img" aria-label="World map">
              <defs>
                <linearGradient id="ocean" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#dff6ff" />
                  <stop offset="55%" stopColor="#bde8f4" />
                  <stop offset="100%" stopColor="#8ac9dc" />
                </linearGradient>
                <linearGradient id="land" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3f9a77" />
                  <stop offset="100%" stopColor="#20735b" />
                </linearGradient>
              </defs>
              <rect width="1000" height="500" fill="url(#ocean)" />
              <g stroke="#155f4f" strokeWidth="2.2" fill="url(#land)" opacity="0.95">
                {landPaths.map((path) => <path key={path} d={path} />)}
              </g>
              <g stroke="#7cc8db" strokeWidth="1" opacity="0.45">
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => <line key={`x-${x}`} x1={x} x2={x} y1="0" y2="500" />)}
                {[100, 200, 300, 400].map((y) => <line key={`y-${y}`} x1="0" x2="1000" y1={y} y2={y} />)}
              </g>
            </svg>

            {mapPlaces.map((place) => (
              (() => {
                const point = projectPlace(place);
                return (
                  <button
                    key={place.name}
                    type="button"
                    onClick={() => void explorePlace(place)}
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 p-1.5 shadow-lg transition-all hover:scale-110 ${
                      selectedPlace.name === place.name ? "border-primary bg-primary text-primary-foreground" : "border-white bg-background text-primary"
                    }`}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    title={place.name}
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                );
              })()
            ))}

            <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-2 gap-2 md:grid-cols-4">
              {filteredPlaces.map((place) => (
                <button key={`quick-${place.name}`} onClick={() => void explorePlace(place)} className="rounded-md border border-border bg-background/90 px-3 py-2 text-left text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-background">
                  {place.name}
                  <span className="block text-[11px] font-normal text-muted-foreground">{place.region}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="glass-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">{selectedPlace.name}</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{selectedPlace.region}</p>
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

          <section className="glass-card p-5">
            {response ? (
              <GeneratedContent content={response} title={`${selectedPlace.name} AI Guide`} type="study" />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-center">
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Click a map marker or search any place to generate an AI guide with history, culture, geography, politics, tourism, and important facts.
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
