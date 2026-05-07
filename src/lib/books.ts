export interface BookCategory {
  id: string;
  label: string;
  description: string;
  topic?: string;
  search?: string;
  languages?: string;
}

export interface LibraryBook {
  id: number;
  title: string;
  authors: string[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  summaries: string[];
  downloadCount: number;
  copyright: boolean | null;
  coverUrl?: string;
  textUrl?: string;
  htmlUrl?: string;
  epubUrl?: string;
  kindleUrl?: string;
  sourceUrl: string;
  categoryLabel: string;
  estimatedPages?: string;
}

export interface BookSearchResponse {
  books: LibraryBook[];
  count: number;
  nextPage: number | null;
  previousPage: number | null;
  source: string;
}

export interface GutendexPerson {
  name: string;
  birth_year?: number | null;
  death_year?: number | null;
}

export interface GutendexBook {
  id: number;
  title: string;
  subjects: string[];
  authors: GutendexPerson[];
  summaries?: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean | null;
  media_type: string;
  formats: Record<string, string>;
  download_count: number;
}

export interface GutendexListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

export const bookCategories: BookCategory[] = [
  { id: "all", label: "All", description: "Popular public-domain books across genres" },
  { id: "study", label: "Study", description: "Education, science, reference, learning, and exams", topic: "education" },
  { id: "novels", label: "Novels", description: "Classic fiction and long-form literature", topic: "fiction" },
  { id: "poetry", label: "Poems", description: "Poetry collections, verse, and spoken rhythm practice", topic: "poetry" },
  { id: "short-stories", label: "Short Stories", description: "Short fiction for quick reading sessions", topic: "short stories" },
  { id: "kids", label: "Kids", description: "Children's stories and simple literature", topic: "children" },
  { id: "comics", label: "Comics", description: "Comics, illustrated stories, and graphic-style public-domain works", topic: "comics" },
  { id: "drama", label: "Drama", description: "Plays, theatre, dialogue, and stage writing", topic: "drama" },
  { id: "film", label: "Film & Cinema", description: "Movie, theatre, and cinema-related reading", topic: "motion pictures" },
  { id: "action", label: "Action", description: "Adventure, travel, quests, and fast-paced classics", topic: "adventure" },
  { id: "suspense", label: "Suspense", description: "Mystery, detective, crime, and suspense fiction", topic: "mystery" },
  { id: "romance", label: "Romance", description: "Romance, relationships, society, and emotional fiction", topic: "love stories" },
  { id: "mature", label: "Adult / Mature", description: "Mature classic literature and serious themes", topic: "psychological fiction" },
  { id: "country", label: "Country / Region", description: "Travel, culture, country histories, and regional writing", topic: "travel" },
  { id: "urdu", label: "Urdu", description: "Urdu-language public-domain results when available", languages: "ur", search: "urdu" },
  { id: "roman-urdu", label: "Roman Urdu", description: "Roman Urdu and South Asian public-domain search results", search: "roman urdu" },
  { id: "english", label: "English", description: "English-language public-domain books", languages: "en" },
];

export const featuredBookIds = [
  1342, 1661, 11, 84, 345, 2701, 174, 844, 1322, 2680, 132, 103, 35, 2600, 135, 996,
  768, 1260, 514, 74, 76, 219, 730, 1497, 158, 1400, 98, 120, 45, 1998, 205, 215,
];

export const fallbackBooks: LibraryBook[] = [
  {
    id: 1342,
    title: "Pride and Prejudice",
    authors: ["Austen, Jane"],
    subjects: ["England -- Fiction", "Courtship -- Fiction", "Love stories"],
    bookshelves: ["Best Books Ever Listings", "Harvard Classics"],
    languages: ["en"],
    summaries: ["A classic English novel about judgment, family, manners, and social expectations."],
    downloadCount: 0,
    copyright: false,
    textUrl: "https://www.gutenberg.org/files/1342/1342-0.txt",
    htmlUrl: "https://www.gutenberg.org/files/1342/1342-h/1342-h.htm",
    epubUrl: "https://www.gutenberg.org/ebooks/1342.epub.images",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    categoryLabel: "Novel",
    estimatedPages: "400+",
  },
  {
    id: 1661,
    title: "The Adventures of Sherlock Holmes",
    authors: ["Doyle, Arthur Conan"],
    subjects: ["Detective and mystery stories", "Holmes, Sherlock -- Fiction"],
    bookshelves: ["Detective Fiction"],
    languages: ["en"],
    summaries: ["A collection of detective stories based on close observation and logical deduction."],
    downloadCount: 0,
    copyright: false,
    textUrl: "https://www.gutenberg.org/files/1661/1661-0.txt",
    htmlUrl: "https://www.gutenberg.org/files/1661/1661-h/1661-h.htm",
    epubUrl: "https://www.gutenberg.org/ebooks/1661.epub.images",
    sourceUrl: "https://www.gutenberg.org/ebooks/1661",
    categoryLabel: "Mystery",
    estimatedPages: "300+",
  },
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    authors: ["Carroll, Lewis"],
    subjects: ["Fantasy fiction", "Children's stories"],
    bookshelves: ["Children's Literature"],
    languages: ["en"],
    summaries: ["A short fantasy classic for children and adults, full of wordplay and imagination."],
    downloadCount: 0,
    copyright: false,
    textUrl: "https://www.gutenberg.org/files/11/11-0.txt",
    htmlUrl: "https://www.gutenberg.org/files/11/11-h/11-h.htm",
    epubUrl: "https://www.gutenberg.org/ebooks/11.epub.images",
    sourceUrl: "https://www.gutenberg.org/ebooks/11",
    categoryLabel: "Kids",
    estimatedPages: "100+",
  },
];

export function findBookCategory(categoryId: string | null) {
  return bookCategories.find((category) => category.id === categoryId) || bookCategories[0];
}

export function pickFormat(formats: Record<string, string>, matcher: (mimeType: string, url: string) => boolean) {
  const entry = Object.entries(formats).find(([mimeType, url]) => Boolean(url) && matcher(mimeType.toLowerCase(), url));
  return entry?.[1];
}

export function estimatePagesFromFormatUrl(url?: string) {
  if (!url) return undefined;
  return "Full text";
}

export function mapGutendexBook(book: GutendexBook, categoryLabel = "Public Domain"): LibraryBook {
  const textUrl = pickFormat(book.formats, (mimeType, url) => mimeType.startsWith("text/plain") && !url.endsWith(".zip"));
  const htmlUrl = pickFormat(book.formats, (mimeType) => mimeType.startsWith("text/html"));
  const epubUrl = pickFormat(book.formats, (mimeType) => mimeType.includes("application/epub+zip"));
  const kindleUrl = pickFormat(book.formats, (mimeType) => mimeType.includes("application/x-mobipocket-ebook"));
  const coverUrl = pickFormat(book.formats, (mimeType) => mimeType.startsWith("image/"));

  return {
    id: book.id,
    title: book.title,
    authors: book.authors?.map((author) => author.name) || ["Unknown author"],
    subjects: book.subjects || [],
    bookshelves: book.bookshelves || [],
    languages: book.languages || [],
    summaries: book.summaries || [],
    downloadCount: book.download_count || 0,
    copyright: book.copyright,
    coverUrl,
    textUrl,
    htmlUrl,
    epubUrl,
    kindleUrl,
    sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
    categoryLabel,
    estimatedPages: estimatePagesFromFormatUrl(textUrl || htmlUrl || epubUrl),
  };
}

export function getBookDescription(book: LibraryBook) {
  return book.summaries[0] || book.subjects.slice(0, 3).join(", ") || "Public-domain book available for online reading and offline download.";
}

export function fileSafeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "book";
}
