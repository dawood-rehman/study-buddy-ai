import { ObjectId, type Document, type Filter } from "mongodb";
import { AdminBookPayload, LibraryBook, bookCategories, bookLanguages } from "@/lib/books";
import { getDb } from "@/lib/server/mongodb";

export type BookDocument = Document & {
  _id: ObjectId;
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
  status: "active" | "draft";
  addedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export function sanitizeBookPayload(payload: Partial<AdminBookPayload>) {
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const authors = normalizeList(payload.authors);
  const genres = normalizeList(payload.genres);
  const tags = normalizeList(payload.tags);
  const language = String(payload.language || "en").trim();

  if (!title) throw new Error("Book title is required.");
  if (!authors.length) throw new Error("At least one author is required.");
  if (!genres.length) throw new Error("At least one genre/category is required.");
  if (!description) throw new Error("Book description is required.");

  return {
    title,
    authors,
    genres,
    language,
    tags,
    description,
    coverUrl: String(payload.coverUrl || "").trim() || undefined,
    textUrl: String(payload.textUrl || "").trim() || undefined,
    htmlUrl: String(payload.htmlUrl || "").trim() || undefined,
    epubUrl: String(payload.epubUrl || "").trim() || undefined,
    pdfUrl: String(payload.pdfUrl || "").trim() || undefined,
    sourceUrl: String(payload.sourceUrl || "").trim() || undefined,
    fullText: String(payload.fullText || "").trim() || undefined,
    estimatedPages: String(payload.estimatedPages || "").trim() || undefined,
    status: payload.status === "draft" ? "draft" as const : "active" as const,
  };
}

function languageLabel(language: string) {
  return bookLanguages.find((item) => item.id === language || item.gutendexCode === language)?.label || language.toUpperCase();
}

function categoryLabel(genres: string[]) {
  const first = genres[0];
  return bookCategories.find((item) => item.id === first || item.label.toLowerCase() === first?.toLowerCase())?.label || first || "Book";
}

export function serializeAdminBook(book: BookDocument): LibraryBook {
  return {
    id: `admin-${book._id.toString()}`,
    source: "admin",
    sourceId: book._id.toString(),
    title: book.title,
    authors: book.authors || [],
    genres: book.genres || [],
    subjects: book.tags || [],
    bookshelves: [],
    languages: [book.language],
    tags: book.tags || [],
    summaries: [book.description].filter(Boolean),
    downloadCount: 0,
    copyright: null,
    coverUrl: book.coverUrl,
    textUrl: book.textUrl,
    htmlUrl: book.htmlUrl,
    epubUrl: book.epubUrl,
    pdfUrl: book.pdfUrl,
    fullText: book.fullText,
    sourceUrl: book.sourceUrl || book.pdfUrl || book.epubUrl || book.textUrl || "",
    categoryLabel: categoryLabel(book.genres || []),
    languageLabel: languageLabel(book.language),
    estimatedPages: book.estimatedPages || (book.fullText ? "Admin text" : "Book"),
    status: book.status,
    createdAt: book.createdAt?.toISOString(),
    updatedAt: book.updatedAt?.toISOString(),
  };
}

export async function ensureBookIndexes() {
  const db = await getDb();
  await Promise.all([
    db.collection("books").createIndex({ status: 1, createdAt: -1 }),
    db.collection("books").createIndex({ language: 1, status: 1 }),
    db.collection("books").createIndex({ genres: 1, status: 1 }),
    db.collection("books").createIndex({ tags: 1, status: 1 }),
    db.collection("books").createIndex({ title: "text", description: "text", authors: "text", tags: "text", genres: "text" }),
  ]);
}

export async function getCustomBooks({
  query,
  category,
  language,
  limit = 80,
  includeDrafts = false,
}: {
  query?: string;
  category?: string;
  language?: string;
  limit?: number;
  includeDrafts?: boolean;
}) {
  const db = await getDb();
  const filter: Filter<BookDocument> = includeDrafts ? {} : { status: "active" };
  const andFilters: Filter<BookDocument>[] = [];

  if (category && category !== "all") {
    andFilters.push({
      $or: [
        { genres: category },
        { tags: category },
        { genres: new RegExp(`^${category}$`, "i") },
        { tags: new RegExp(`^${category}$`, "i") },
      ],
    });
  }

  if (language && language !== "all") {
    andFilters.push({ language });
  }

  if (query) {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    andFilters.push({
      $or: [
        { title: regex },
        { authors: regex },
        { description: regex },
        { tags: regex },
        { genres: regex },
      ],
    });
  }

  if (andFilters.length) {
    filter.$and = andFilters;
  }

  const books = await db.collection<BookDocument>("books")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return books.map(serializeAdminBook);
}

export async function getCustomBookById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const book = await db.collection<BookDocument>("books").findOne({ _id: new ObjectId(id) });
  return book ? serializeAdminBook(book) : null;
}
