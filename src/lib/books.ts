export interface BookCategory {
  id: string;
  label: string;
  description: string;
  topic?: string;
  search?: string;
  include?: string[];
  exclude?: string[];
}

export interface BookLanguage {
  id: string;
  label: string;
  gutendexCode?: string;
}

export interface LibraryBook {
  id: string;
  source: "gutenberg" | "admin";
  sourceId?: string;
  title: string;
  authors: string[];
  genres: string[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  tags: string[];
  summaries: string[];
  downloadCount: number;
  copyright: boolean | null;
  coverUrl?: string;
  textUrl?: string;
  htmlUrl?: string;
  epubUrl?: string;
  kindleUrl?: string;
  pdfUrl?: string;
  fullText?: string;
  sourceUrl: string;
  categoryLabel: string;
  languageLabel: string;
  estimatedPages?: string;
  status?: "active" | "draft";
  createdAt?: string;
  updatedAt?: string;
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

export interface AdminBookPayload {
  title: string;
  authors: string[];
  genres: string[];
  language: string;
  tags: string[];
  description: string;
  coverUrl?: string;
  textUrl?: string;
  htmlUrl?: string;
  epubUrl?: string;
  pdfUrl?: string;
  sourceUrl?: string;
  fullText?: string;
  estimatedPages?: string;
  status?: "active" | "draft";
}

export const BOOKS_PER_PAGE = 10;

export const bookCategories: BookCategory[] = [
  { id: "all", label: "All Genres", description: "Large public-domain library across fiction, learning, history, poetry, drama, and more" },
  { id: "study", label: "Study", description: "Education, reference, science, learning, and exam-friendly reading", search: "education science textbook mathematics physics biology psychology" },
  { id: "programming", label: "Programming", description: "Computer science, programming history, algorithms, and technical learning", search: "computer programming software algorithms data processing", include: ["computer", "programming", "software", "algorithm", "data processing", "electronics", "technology"] },
  { id: "motivation", label: "Motivation", description: "Self-improvement, discipline, character, purpose, and uplifting classics", search: "success self help conduct life character happiness", include: ["success", "self-help", "conduct of life", "character", "happiness", "ethics", "inspiration"] },
  { id: "novels", label: "Novels", description: "Classic fiction and long-form literature", topic: "fiction", include: ["fiction", "novel"] },
  { id: "classics", label: "Classics", description: "Widely read public-domain classics", search: "classic literature" },
  { id: "urdu-literature", label: "Urdu Literature", description: "Admin-curated Urdu literary books, fiction, poetry, and essays", search: "urdu literature" },
  { id: "english-literature", label: "English Literature", description: "English literary classics, essays, novels, poetry, and drama", search: "english literature", include: ["english literature", "literature", "fiction", "poetry", "drama"] },
  { id: "poetry", label: "Poems / Shayari", description: "Poetry, verse, shayari, ghazal, and literary collections", topic: "poetry", include: ["poetry", "poems", "verse", "sonnets", "ballads", "songs", "shayari", "ghazal"], exclude: ["fiction"] },
  { id: "short-stories", label: "Short Stories", description: "Genuine short story collections and short fiction", search: "short stories short fiction", include: ["short stories", "short story", "short fiction", "stories"], exclude: ["novel", "long fiction"] },
  { id: "kids", label: "Kids", description: "Children's stories, fairy tales, school reading, and simple literature", topic: "children", include: ["children", "juvenile", "fairy tales", "nursery", "school"], exclude: ["adult"] },
  { id: "comics", label: "Comics & Fantasy", description: "Comics, illustrated stories, fantasy worlds, heroic adventures, and public-domain inspirations", search: "comics fantasy magic adventure illustrated fairy tales", include: ["comic", "comics", "illustrated", "fantasy", "magic", "adventure", "fairy"], exclude: ["treatise"] },
  { id: "drama", label: "Drama", description: "Authentic drama literature, plays, theatre, and stage writing from different regions", topic: "drama", include: ["drama", "plays", "theater", "theatre", "tragedy", "comedy", "stage"], exclude: ["novel"] },
  { id: "film", label: "Film & Cinema", description: "Movie, theatre, and cinema-related reading", topic: "motion pictures" },
  { id: "action", label: "Action", description: "Adventure, travel, quests, and fast-paced classics", topic: "adventure" },
  { id: "suspense", label: "Suspense", description: "Mystery, detective, crime, and suspense fiction", topic: "mystery" },
  { id: "romance", label: "Romance", description: "Romance, relationships, society, and emotional fiction", topic: "love stories" },
  { id: "adult", label: "Adult / Mature", description: "Mature classic literature and serious themes", topic: "psychological fiction" },
  { id: "country-region", label: "Country / Region", description: "Travel, culture, country histories, and regional writing", topic: "travel" },
  { id: "biography", label: "Biography", description: "Life stories, memoirs, leadership, and historical figures", topic: "biography" },
  { id: "history", label: "History", description: "World, Islamic, political, ancient, war, country, and civilization history", search: "world history islamic political ancient civilization war country history", include: ["history", "civilization", "war", "political", "ancient", "islam", "country"] },
  { id: "sports", label: "Sports", description: "Sports, games, athletics, cricket, football, and physical culture", search: "sports games athletics cricket football baseball physical culture", include: ["sports", "games", "athletics", "cricket", "football", "baseball", "tennis", "physical culture"] },
  { id: "countries", label: "Country Books", description: "Books about Pakistan, India, Germany, Saudi Arabia, Iran, USA, UK, UAE, China, Europe, Italy, Syria, Jordan, Palestine, and more", search: "Pakistan India Germany Arabia Iran America Britain China Europe Italy Syria Jordan Palestine travel history culture politics geography", include: ["pakistan", "india", "germany", "arabia", "iran", "america", "united states", "britain", "england", "china", "europe", "italy", "syria", "jordan", "palestine", "travel", "geography", "culture"] },
  { id: "biology", label: "Biology", description: "Biology, life science, nature, botany, zoology, and anatomy", topic: "biology", include: ["biology", "botany", "zoology", "anatomy", "life", "natural history"] },
  { id: "physics", label: "Physics", description: "Physics, astronomy, electricity, mechanics, and science learning", topic: "physics", include: ["physics", "astronomy", "electricity", "mechanics", "science"] },
  { id: "mathematics", label: "Mathematics", description: "Math, arithmetic, algebra, geometry, and problem solving", topic: "mathematics", include: ["mathematics", "algebra", "geometry", "arithmetic", "calculus"] },
  { id: "psychology", label: "Psychology", description: "Psychology, mind, behavior, education, and mental wellbeing", topic: "psychology", include: ["psychology", "mind", "behavior", "mental", "education"] },
  { id: "science", label: "Science", description: "Science, nature, astronomy, biology, and discovery", topic: "science" },
  { id: "philosophy", label: "Philosophy", description: "Philosophy, ethics, logic, reflection, and meaning", topic: "philosophy" },
  { id: "religion", label: "Religion", description: "Religion, spirituality, theology, and sacred literature", topic: "religion" },
  { id: "health", label: "Health", description: "Health, wellbeing, medicine, and lifestyle", topic: "health" },
  { id: "humor", label: "Humor", description: "Funny essays, satire, and comic writing", topic: "humor" },
  { id: "horror", label: "Horror", description: "Gothic fiction, horror, monsters, and dark classics", topic: "horror" },
  { id: "fantasy", label: "Fantasy", description: "Fantasy, fairy tales, folklore, and imagination", topic: "fantasy" },
  { id: "sci-fi", label: "Sci-Fi", description: "Science fiction, future worlds, and speculative classics", topic: "science fiction" },
  { id: "essays", label: "Essays", description: "Essays, speeches, letters, and reflective prose", topic: "essays" },
  { id: "business", label: "Business", description: "Business, economics, management, and finance classics", search: "business economics finance" },
];

export const bookLanguages: BookLanguage[] = [
  { id: "all", label: "All Languages" },
  { id: "en", label: "English", gutendexCode: "en" },
  { id: "ur", label: "Urdu", gutendexCode: "ur" },
  { id: "roman-ur", label: "Roman Urdu" },
  { id: "fr", label: "French", gutendexCode: "fr" },
  { id: "de", label: "German", gutendexCode: "de" },
  { id: "es", label: "Spanish", gutendexCode: "es" },
  { id: "it", label: "Italian", gutendexCode: "it" },
  { id: "pt", label: "Portuguese", gutendexCode: "pt" },
  { id: "hi", label: "Hindi", gutendexCode: "hi" },
];

export const featuredBookIds = [
  1342, 1661, 11, 84, 345, 2701, 174, 844, 1322, 2680, 132, 103, 35, 2600, 135, 996,
  768, 1260, 514, 74, 76, 219, 730, 1497, 158, 1400, 98, 120, 45, 1998, 205, 215,
  1727, 4300, 5200, 5740, 2554, 244, 46, 829, 600, 8294, 408, 36, 6130, 1250, 8800,
];

export const fallbackBooks: LibraryBook[] = [
  {
    id: "gutenberg-1342",
    source: "gutenberg",
    sourceId: "1342",
    title: "Pride and Prejudice",
    authors: ["Austen, Jane"],
    genres: ["novels", "romance", "classics"],
    subjects: ["England -- Fiction", "Courtship -- Fiction", "Love stories"],
    bookshelves: ["Best Books Ever Listings", "Harvard Classics"],
    languages: ["en"],
    tags: ["classic", "romance", "society"],
    summaries: ["A classic English novel about judgment, family, manners, and social expectations."],
    downloadCount: 0,
    copyright: false,
    textUrl: "https://www.gutenberg.org/files/1342/1342-0.txt",
    htmlUrl: "https://www.gutenberg.org/files/1342/1342-h/1342-h.htm",
    epubUrl: "https://www.gutenberg.org/ebooks/1342.epub.images",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    categoryLabel: "Classic Novel",
    languageLabel: "English",
    estimatedPages: "400+",
  },
  {
    id: "gutenberg-1661",
    source: "gutenberg",
    sourceId: "1661",
    title: "The Adventures of Sherlock Holmes",
    authors: ["Doyle, Arthur Conan"],
    genres: ["suspense", "short-stories", "classics"],
    subjects: ["Detective and mystery stories", "Holmes, Sherlock -- Fiction"],
    bookshelves: ["Detective Fiction"],
    languages: ["en"],
    tags: ["detective", "mystery", "logic"],
    summaries: ["A collection of detective stories based on close observation and logical deduction."],
    downloadCount: 0,
    copyright: false,
    textUrl: "https://www.gutenberg.org/files/1661/1661-0.txt",
    htmlUrl: "https://www.gutenberg.org/files/1661/1661-h/1661-h.htm",
    epubUrl: "https://www.gutenberg.org/ebooks/1661.epub.images",
    sourceUrl: "https://www.gutenberg.org/ebooks/1661",
    categoryLabel: "Mystery",
    languageLabel: "English",
    estimatedPages: "300+",
  },
  {
    id: "gutenberg-11",
    source: "gutenberg",
    sourceId: "11",
    title: "Alice's Adventures in Wonderland",
    authors: ["Carroll, Lewis"],
    genres: ["kids", "fantasy", "classics"],
    subjects: ["Fantasy fiction", "Children's stories"],
    bookshelves: ["Children's Literature"],
    languages: ["en"],
    tags: ["children", "fantasy", "wordplay"],
    summaries: ["A short fantasy classic for children and adults, full of wordplay and imagination."],
    downloadCount: 0,
    copyright: false,
    textUrl: "https://www.gutenberg.org/files/11/11-0.txt",
    htmlUrl: "https://www.gutenberg.org/files/11/11-h/11-h.htm",
    epubUrl: "https://www.gutenberg.org/ebooks/11.epub.images",
    sourceUrl: "https://www.gutenberg.org/ebooks/11",
    categoryLabel: "Kids",
    languageLabel: "English",
    estimatedPages: "100+",
  },
];

export function findBookCategory(categoryId: string | null) {
  return bookCategories.find((category) => category.id === categoryId) || bookCategories[0];
}

export function findBookLanguage(languageId: string | null) {
  return bookLanguages.find((language) => language.id === languageId) || bookLanguages[0];
}

export function pickFormat(formats: Record<string, string>, matcher: (mimeType: string, url: string) => boolean) {
  const entry = Object.entries(formats).find(([mimeType, url]) => Boolean(url) && matcher(mimeType.toLowerCase(), url));
  return entry?.[1];
}

export function estimatePagesFromFormatUrl(url?: string) {
  if (!url) return undefined;
  return "Full text";
}

function labelForLanguage(languages: string[]) {
  const first = languages[0];
  return bookLanguages.find((language) => language.id === first || language.gutendexCode === first)?.label || first?.toUpperCase() || "Unknown";
}

function inferGenres(book: GutendexBook, categoryLabel: string) {
  const haystack = [...book.subjects, ...book.bookshelves, categoryLabel].join(" ").toLowerCase();
  const genres = bookCategories
    .filter((category) => category.id !== "all" && [category.id, category.label.toLowerCase(), category.topic, category.search].filter(Boolean).some((term) => haystack.includes(String(term).toLowerCase())))
    .map((category) => category.id);

  return Array.from(new Set(genres.length ? genres : [categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")]));
}

export function mapGutendexBook(book: GutendexBook, categoryLabel = "Public Domain"): LibraryBook {
  const textUrl = pickFormat(book.formats, (mimeType, url) => mimeType.startsWith("text/plain") && !url.endsWith(".zip"));
  const htmlUrl = pickFormat(book.formats, (mimeType) => mimeType.startsWith("text/html"));
  const epubUrl = pickFormat(book.formats, (mimeType) => mimeType.includes("application/epub+zip"));
  const kindleUrl = pickFormat(book.formats, (mimeType) => mimeType.includes("application/x-mobipocket-ebook"));
  const pdfUrl = pickFormat(book.formats, (mimeType) => mimeType.includes("application/pdf"));
  const coverUrl = pickFormat(book.formats, (mimeType) => mimeType.startsWith("image/"));

  return {
    id: `gutenberg-${book.id}`,
    source: "gutenberg",
    sourceId: String(book.id),
    title: book.title,
    authors: book.authors?.map((author) => author.name) || ["Unknown author"],
    genres: inferGenres(book, categoryLabel),
    subjects: book.subjects || [],
    bookshelves: book.bookshelves || [],
    languages: book.languages || [],
    tags: [...(book.subjects || []), ...(book.bookshelves || [])].slice(0, 12),
    summaries: book.summaries || [],
    downloadCount: book.download_count || 0,
    copyright: book.copyright,
    coverUrl,
    textUrl,
    htmlUrl,
    epubUrl,
    kindleUrl,
    pdfUrl,
    sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
    categoryLabel,
    languageLabel: labelForLanguage(book.languages || []),
    estimatedPages: estimatePagesFromFormatUrl(textUrl || htmlUrl || epubUrl),
  };
}

export function getBookDescription(book: LibraryBook) {
  return book.summaries[0] || book.subjects.slice(0, 3).join(", ") || "Public-domain book available for online reading and offline download.";
}

export function bookSearchText(book: LibraryBook) {
  return [
    book.title,
    ...book.authors,
    ...book.genres,
    ...book.subjects,
    ...book.bookshelves,
    ...book.tags,
    ...book.summaries,
    book.categoryLabel,
    book.languageLabel,
  ].join(" ").toLowerCase();
}

export function matchesBookCategory(book: LibraryBook, category: BookCategory) {
  if (category.id === "all") return true;

  const text = bookSearchText(book);
  const genreMatch = book.genres.some((genre) => genre.toLowerCase() === category.id || genre.toLowerCase() === category.label.toLowerCase());
  const includeMatch = !category.include?.length || category.include.some((term) => text.includes(term.toLowerCase()));
  const excludeMatch = category.exclude?.some((term) => text.includes(term.toLowerCase()));

  return (genreMatch || includeMatch) && !excludeMatch;
}

export function fileSafeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "book";
}

export function parseBookId(id: string) {
  if (id.startsWith("gutenberg-")) {
    return { source: "gutenberg" as const, sourceId: id.replace("gutenberg-", "") };
  }

  if (id.startsWith("admin-")) {
    return { source: "admin" as const, sourceId: id.replace("admin-", "") };
  }

  return { source: /^\d+$/.test(id) ? "gutenberg" as const : "admin" as const, sourceId: id };
}
