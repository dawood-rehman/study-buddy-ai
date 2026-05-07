import { NextRequest, NextResponse } from "next/server";
import {
  BOOKS_PER_PAGE,
  BookCategory,
  BookLanguage,
  BookSearchResponse,
  LibraryBook,
  fallbackBooks,
  featuredBookIds,
  findBookCategory,
  findBookLanguage,
  GutendexListResponse,
  matchesBookCategory,
  mapGutendexBook,
} from "@/lib/books";
import { getCustomBooks } from "@/lib/server/books";

const GUTENDEX_API = "https://gutendex.com/books/";
const IA_ADVANCED_API = "https://archive.org/advancedsearch.php";
const IA_METADATA_API = "https://archive.org/metadata/";
const OPEN_LIBRARY_SEARCH_API = "https://openlibrary.org/search.json";
const DOAB_SEARCH_API = "https://directory.doabooks.org/server/api/discover/search/objects";

type ArchiveSearchResponse = {
  response?: {
    numFound?: number;
    docs?: ArchiveDoc[];
  };
};

type ArchiveDoc = {
  identifier: string;
  title?: string;
  creator?: string | string[];
  description?: string | string[];
  subject?: string | string[];
  language?: string | string[];
  downloads?: number;
};

type ArchiveMetadataResponse = {
  metadata?: ArchiveDoc & {
    title?: string;
  };
  files?: Array<{
    name: string;
    format?: string;
    size?: string;
  }>;
};

type OpenLibrarySearchResponse = {
  numFound?: number;
  docs?: Array<{
    key?: string;
    title?: string;
    author_name?: string[];
    subject?: string[];
    language?: string[];
    cover_i?: number;
    ia?: string[];
    ebook_access?: string;
  }>;
};

type DoabSearchResponse = {
  page?: { totalElements?: number };
  _embedded?: {
    searchResult?: {
      _embedded?: {
        objects?: Array<{
          _embedded?: {
            indexableObject?: {
              name?: string;
              uuid?: string;
              metadata?: Record<string, Array<{ value?: string }>>;
            };
          };
        }>;
      };
    };
  };
};

function pageFromUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const page = Number(parsed.searchParams.get("page") || "1");
    return Number.isFinite(page) ? page : null;
  } catch {
    return null;
  }
}

function normalizeList(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeTerm(value: string) {
  return value.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function languageLabel(language?: string | string[]) {
  const values = normalizeList(language).map((item) => item.toLowerCase());
  if (values.some((item) => item.includes("urdu") || item === "ur" || item === "urd")) return "Urdu";
  if (values.some((item) => item.includes("hindi") || item === "hi")) return "Hindi";
  if (values.some((item) => item.includes("english") || item === "en")) return "English";
  return normalizeList(language)[0] || "Unknown";
}

function sourceUrlForArchive(identifier: string) {
  return `https://archive.org/details/${encodeURIComponent(identifier)}`;
}

function archiveDownloadUrl(identifier: string, fileName: string) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
}

function pickArchiveFile(files: ArchiveMetadataResponse["files"], matcher: (file: NonNullable<ArchiveMetadataResponse["files"]>[number]) => boolean) {
  return files?.find((file) => file.name && matcher(file));
}

function mapArchiveMetadata(identifier: string, meta: ArchiveMetadataResponse, category: BookCategory): LibraryBook | null {
  const metadata: Partial<ArchiveDoc> = meta.metadata || {};
  const files = meta.files || [];
  const pdfFile = pickArchiveFile(files, (file) => /\.pdf$/i.test(file.name) && !/(_abbyy|_jp2|_text)/i.test(file.name));
  const textFile = pickArchiveFile(files, (file) => /_djvu\.txt$/i.test(file.name) || file.format?.toLowerCase().includes("text"));
  const epubFile = pickArchiveFile(files, (file) => /\.epub$/i.test(file.name) || file.format?.toLowerCase().includes("epub"));

  if (!pdfFile && !textFile && !epubFile) return null;

  const title = metadata.title || identifier;
  const subjects = normalizeList(metadata.subject);
  const authors = normalizeList(metadata.creator);
  const languages = normalizeList(metadata.language).map((item) => item.toLowerCase().includes("urdu") ? "ur" : item.toLowerCase().includes("english") ? "en" : item.toLowerCase());

  return {
    id: `ia-${encodeURIComponent(identifier)}`,
    source: "internet-archive",
    sourceId: identifier,
    title,
    authors: authors.length ? authors : ["Internet Archive"],
    genres: [category.id],
    subjects,
    bookshelves: ["Internet Archive"],
    languages: languages.length ? languages : ["unknown"],
    tags: subjects.slice(0, 12),
    summaries: normalizeList(metadata.description).slice(0, 1),
    downloadCount: Number(metadata.downloads || 0),
    copyright: null,
    coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    textUrl: textFile ? archiveDownloadUrl(identifier, textFile.name) : undefined,
    pdfUrl: pdfFile ? archiveDownloadUrl(identifier, pdfFile.name) : undefined,
    epubUrl: epubFile ? archiveDownloadUrl(identifier, epubFile.name) : undefined,
    htmlUrl: sourceUrlForArchive(identifier),
    sourceUrl: sourceUrlForArchive(identifier),
    categoryLabel: category.label,
    languageLabel: languageLabel(metadata.language),
    estimatedPages: pdfFile ? "PDF" : textFile ? "Full text" : "EPUB",
  };
}

function buildArchiveQuery(query: string, category: BookCategory, language: BookLanguage) {
  const terms = [
    query,
    !query ? category.search || category.topic || category.label : "",
    language.id === "ur" ? "urdu" : "",
    language.id === "roman-ur" ? "\"roman urdu\"" : "",
  ].filter(Boolean).map(safeTerm);

  const search = terms.length ? terms.join(" ") : "book";
  const languageClause = language.id === "ur" ? " AND (language:Urdu OR language:urd)" : language.id === "en" ? " AND (language:English OR language:eng)" : "";
  return `mediatype:texts AND (${search})${languageClause}`;
}

async function loadArchiveBooks(query: string, category: BookCategory, language: BookLanguage, page: number) {
  const url = new URL(IA_ADVANCED_API);
  url.searchParams.set("q", buildArchiveQuery(query, category, language));
  ["identifier", "title", "creator", "description", "subject", "language", "downloads"].forEach((field) => url.searchParams.append("fl[]", field));
  url.searchParams.set("rows", String(BOOKS_PER_PAGE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("output", "json");
  url.searchParams.set("sort[]", "downloads desc");

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 12 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Internet Archive returned ${response.status}.`);
  const data = (await response.json()) as ArchiveSearchResponse;
  const docs = data.response?.docs || [];
  const books = await Promise.all(docs.map(async (doc) => {
    try {
      const metaResponse = await fetch(`${IA_METADATA_API}${encodeURIComponent(doc.identifier)}`, {
        next: { revalidate: 60 * 60 * 24 },
        headers: { Accept: "application/json" },
      });
      if (!metaResponse.ok) return null;
      return mapArchiveMetadata(doc.identifier, await metaResponse.json() as ArchiveMetadataResponse, category);
    } catch {
      return null;
    }
  }));

  return {
    books: books.filter((book): book is LibraryBook => Boolean(book)).filter((book) => matchesBookCategory(book, category)),
    count: data.response?.numFound || 0,
  };
}

async function loadOpenLibraryBooks(query: string, category: BookCategory, language: BookLanguage, page: number) {
  const searchText = query || category.search || category.topic || category.label;
  const url = new URL(OPEN_LIBRARY_SEARCH_API);
  url.searchParams.set("q", searchText);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "12");
  if (language.gutendexCode) url.searchParams.set("language", language.gutendexCode);

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 12 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Open Library returned ${response.status}.`);
  const data = (await response.json()) as OpenLibrarySearchResponse;
  const docs = data.docs || [];
  const iaIdentifiers = docs.flatMap((doc) => doc.ia || []).slice(0, 6);
  const archiveBooks = await Promise.all(iaIdentifiers.map(async (identifier) => {
    try {
      const metaResponse = await fetch(`${IA_METADATA_API}${encodeURIComponent(identifier)}`, {
        next: { revalidate: 60 * 60 * 24 },
        headers: { Accept: "application/json" },
      });
      if (!metaResponse.ok) return null;
      return mapArchiveMetadata(identifier, await metaResponse.json() as ArchiveMetadataResponse, category);
    } catch {
      return null;
    }
  }));

  const metadataOnly = docs
    .filter((doc) => !doc.ia?.length && doc.key && doc.title)
    .slice(0, 4)
    .map((doc): LibraryBook => ({
      id: `ol-${encodeURIComponent(doc.key || doc.title || "book")}`,
      source: "open-library",
      sourceId: doc.key,
      title: doc.title || "Untitled",
      authors: doc.author_name || ["Open Library"],
      genres: [category.id],
      subjects: (doc.subject || []).slice(0, 8),
      bookshelves: ["Open Library"],
      languages: doc.language || [],
      tags: (doc.subject || []).slice(0, 12),
      summaries: [`Catalog record from Open Library. Availability may be preview, borrow, or metadata-only depending on rights.`],
      downloadCount: 0,
      copyright: null,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
      sourceUrl: `https://openlibrary.org${doc.key}`,
      htmlUrl: `https://openlibrary.org${doc.key}`,
      categoryLabel: category.label,
      languageLabel: languageLabel(doc.language),
      estimatedPages: doc.ebook_access || "Catalog",
    }));

  return {
    books: [...archiveBooks.filter((book): book is LibraryBook => Boolean(book)), ...metadataOnly].filter((book) => matchesBookCategory(book, category)),
    count: data.numFound || 0,
  };
}

function metadataValue(metadata: Record<string, Array<{ value?: string }>> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]?.[0]?.value;
    if (value) return value;
  }
  return "";
}

async function loadDoabBooks(query: string, category: BookCategory, language: BookLanguage, page: number) {
  const searchText = query || category.search || category.topic || category.label;
  const url = new URL(DOAB_SEARCH_API);
  url.searchParams.set("query", searchText);
  url.searchParams.set("size", "8");
  url.searchParams.set("page", String(Math.max(0, page - 1)));

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`DOAB returned ${response.status}.`);
  const data = (await response.json()) as DoabSearchResponse;
  const objects = data._embedded?.searchResult?._embedded?.objects || [];
  const books = objects.map((item): LibraryBook | null => {
    const object = item._embedded?.indexableObject;
    if (!object?.name) return null;
    const metadata = object.metadata;
    const pdfUrl = metadataValue(metadata, ["dc.identifier.uri", "dc.relation.ispartofseries"]);
    const languageValue = metadataValue(metadata, ["dc.language.iso", "dc.language"]);
    if (language.id !== "all" && languageValue && !languageValue.toLowerCase().startsWith(language.id)) return null;

    const sourceUrl = pdfUrl || `https://directory.doabooks.org/handle/20.500.12854/${object.uuid}`;
    return {
      id: `doab-${encodeURIComponent(sourceUrl)}`,
      source: "doab",
      sourceId: sourceUrl,
      title: object.name,
      authors: [metadataValue(metadata, ["dc.contributor.author", "dc.creator"]) || "DOAB"],
      genres: [category.id, "study"],
      subjects: [metadataValue(metadata, ["dc.subject", "dc.description.abstract"])].filter(Boolean),
      bookshelves: ["Directory of Open Access Books"],
      languages: [languageValue || "unknown"],
      tags: [category.label, "open access", "academic"],
      summaries: [metadataValue(metadata, ["dc.description.abstract", "dc.description"])].filter(Boolean),
      downloadCount: 0,
      copyright: false,
      sourceUrl,
      pdfUrl: sourceUrl,
      htmlUrl: sourceUrl,
      categoryLabel: "Open Access Academic",
      languageLabel: languageLabel(languageValue),
      estimatedPages: "Open access",
    };
  }).filter((book): book is LibraryBook => Boolean(book));

  return {
    books: books.filter((book) => matchesBookCategory(book, category)),
    count: data.page?.totalElements || books.length,
  };
}

async function loadGutenbergBooks(query: string, category: BookCategory, language: BookLanguage, page: number) {
  const url = new URL(GUTENDEX_API);
  url.searchParams.set("copyright", "false");
  url.searchParams.set("mime_type", "text/plain");
  url.searchParams.set("page", String(page));

  if (!query && category.id === "all" && language.id === "all" && page === 1) {
    url.searchParams.set("ids", featuredBookIds.join(","));
  } else {
    if (query) url.searchParams.set("search", query);
    if (!query && category.search) url.searchParams.set("search", category.search);
    if (category.topic) url.searchParams.set("topic", category.topic);
    if (language.gutendexCode) url.searchParams.set("languages", language.gutendexCode);
  }

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 12 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Gutendex returned ${response.status}.`);
  const data = (await response.json()) as GutendexListResponse;
  const books = data.results
    .map((book) => mapGutendexBook(book, category.label))
    .filter((book) => {
      if (!(book.textUrl || book.htmlUrl || book.epubUrl || book.pdfUrl)) return false;
      if (language.id === "all") return true;
      return book.languages.includes(language.id) || book.languages.includes(language.gutendexCode || "");
    })
    .filter((book) => matchesBookCategory(book, category));

  return {
    books,
    count: data.count,
    nextPage: pageFromUrl(data.next),
    previousPage: pageFromUrl(data.previous),
  };
}

async function loadAdminBooks(query: string, categoryId: string, languageId: string) {
  try {
    return await getCustomBooks({
      query,
      category: categoryId,
      language: languageId,
      limit: 80,
    });
  } catch {
    return [];
  }
}

function dedupeBooks(books: LibraryBook[]) {
  const seen = new Set<string>();
  return books.filter((book) => {
    const key = [book.source, book.sourceId || book.id, book.title.toLowerCase(), book.authors[0]?.toLowerCase()].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() || "";
  const category = findBookCategory(searchParams.get("category"));
  const language = findBookLanguage(searchParams.get("language"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const shouldUseFallback = language.id === "all" && category.id === "all" && !query;
  const usePublicSources = language.id !== "roman-ur";

  const adminBooks = await loadAdminBooks(query, category.id, language.id);

  if (!usePublicSources) {
    const archive = await loadArchiveBooks(query || "roman urdu", category, language, page).catch(() => ({ books: [], count: 0 }));
    const books = dedupeBooks([...adminBooks, ...archive.books]).slice(0, BOOKS_PER_PAGE);

    return NextResponse.json({
      books,
      count: adminBooks.length + archive.count,
      nextPage: archive.books.length >= BOOKS_PER_PAGE ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
      source: "Admin Library + Internet Archive / Roman Urdu search",
    } satisfies BookSearchResponse);
  }

  const [gutenberg, archive, openLibrary, doab] = await Promise.all([
    loadGutenbergBooks(query, category, language, page).catch(() => ({ books: [], count: 0, nextPage: null, previousPage: null })),
    loadArchiveBooks(query, category, language, page).catch(() => ({ books: [], count: 0 })),
    loadOpenLibraryBooks(query, category, language, page).catch(() => ({ books: [], count: 0 })),
    ["study", "programming", "biology", "physics", "mathematics", "psychology", "history", "all"].includes(category.id)
      ? loadDoabBooks(query, category, language, page).catch(() => ({ books: [], count: 0 }))
      : Promise.resolve({ books: [], count: 0 }),
  ]);

  const combined = dedupeBooks([
    ...(page === 1 ? adminBooks : []),
    ...archive.books,
    ...gutenberg.books,
    ...openLibrary.books,
    ...doab.books,
  ]);
  const fallback = shouldUseFallback && !combined.length ? fallbackBooks : [];
  const pageBooks = (combined.length ? combined : fallback).slice(0, BOOKS_PER_PAGE);
  const hasMoreLocal = combined.length > BOOKS_PER_PAGE;
  const totalCount = adminBooks.length + gutenberg.count + archive.count + openLibrary.count + doab.count || pageBooks.length;

  return NextResponse.json({
    books: pageBooks,
    count: totalCount,
    nextPage: hasMoreLocal || gutenberg.nextPage || archive.count > page * BOOKS_PER_PAGE || openLibrary.count > page * BOOKS_PER_PAGE
      ? (gutenberg.nextPage || page + 1)
      : null,
    previousPage: page > 1 ? (gutenberg.previousPage || page - 1) : null,
    source: "Admin Library + Internet Archive + Gutendex + Open Library + DOAB",
  } satisfies BookSearchResponse);
}
