import { NextRequest, NextResponse } from "next/server";
import { fallbackBooks, GutendexBook, LibraryBook, mapGutendexBook, parseBookId } from "@/lib/books";
import { getCustomBookById } from "@/lib/server/books";

const GUTENDEX_API = "https://gutendex.com/books/";
const IA_METADATA_API = "https://archive.org/metadata/";
const MAX_READER_CHARS = 1_800_000;

function cleanBookText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function archiveDownloadUrl(identifier: string, fileName: string) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
}

async function getArchiveBook(identifier: string): Promise<LibraryBook | null> {
  const response = await fetch(`${IA_METADATA_API}${encodeURIComponent(identifier)}`, {
    next: { revalidate: 60 * 60 * 24 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const data = await response.json() as {
    metadata?: {
      title?: string;
      creator?: string | string[];
      subject?: string | string[];
      description?: string | string[];
      language?: string | string[];
    };
    files?: Array<{ name: string; format?: string }>;
  };
  const files = data.files || [];
  const textFile = files.find((file) => /_djvu\.txt$/i.test(file.name) || file.format?.toLowerCase().includes("text"));
  const pdfFile = files.find((file) => /\.pdf$/i.test(file.name) && !/(_abbyy|_jp2|_text)/i.test(file.name));
  const epubFile = files.find((file) => /\.epub$/i.test(file.name) || file.format?.toLowerCase().includes("epub"));
  const list = (value?: string | string[]) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  return {
    id: `ia-${encodeURIComponent(identifier)}`,
    source: "internet-archive",
    sourceId: identifier,
    title: data.metadata?.title || identifier,
    authors: list(data.metadata?.creator).length ? list(data.metadata?.creator) : ["Internet Archive"],
    genres: [],
    subjects: list(data.metadata?.subject),
    bookshelves: ["Internet Archive"],
    languages: list(data.metadata?.language),
    tags: list(data.metadata?.subject).slice(0, 12),
    summaries: list(data.metadata?.description).slice(0, 1),
    downloadCount: 0,
    copyright: null,
    coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    textUrl: textFile ? archiveDownloadUrl(identifier, textFile.name) : undefined,
    pdfUrl: pdfFile ? archiveDownloadUrl(identifier, pdfFile.name) : undefined,
    epubUrl: epubFile ? archiveDownloadUrl(identifier, epubFile.name) : undefined,
    htmlUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
    sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
    categoryLabel: "Internet Archive",
    languageLabel: list(data.metadata?.language)[0] || "Unknown",
    estimatedPages: pdfFile ? "PDF" : textFile ? "Full text" : "Book",
  };
}

async function getBook(id: string) {
  const parsed = parseBookId(id);

  if (parsed.source === "admin") {
    try {
      return await getCustomBookById(parsed.sourceId);
    } catch {
      return null;
    }
  }

  if (parsed.source === "internet-archive") {
    return getArchiveBook(parsed.sourceId).catch(() => null);
  }

  if (parsed.source === "doab") {
    return {
      id,
      source: "doab",
      sourceId: parsed.sourceId,
      title: "Open Access Book",
      authors: ["DOAB"],
      genres: ["study"],
      subjects: [],
      bookshelves: ["Directory of Open Access Books"],
      languages: [],
      tags: ["open access"],
      summaries: ["Open-access academic book record."],
      downloadCount: 0,
      copyright: false,
      pdfUrl: parsed.sourceId,
      htmlUrl: parsed.sourceId,
      sourceUrl: parsed.sourceId,
      categoryLabel: "Open Access Academic",
      languageLabel: "Unknown",
      estimatedPages: "Open access",
    } satisfies LibraryBook;
  }

  if (parsed.source === "open-library") {
    const sourceUrl = `https://openlibrary.org${parsed.sourceId.startsWith("/") ? parsed.sourceId : `/${parsed.sourceId}`}`;
    return {
      id,
      source: "open-library",
      sourceId: parsed.sourceId,
      title: "Open Library Book",
      authors: ["Open Library"],
      genres: [],
      subjects: [],
      bookshelves: ["Open Library"],
      languages: [],
      tags: ["catalog"],
      summaries: ["Open Library catalog record. Full text availability depends on the linked edition."],
      downloadCount: 0,
      copyright: null,
      htmlUrl: sourceUrl,
      sourceUrl,
      categoryLabel: "Open Library",
      languageLabel: "Unknown",
      estimatedPages: "Catalog",
    } satisfies LibraryBook;
  }

  const fallback = fallbackBooks.find((book) => book.sourceId === parsed.sourceId || book.id === id);

  try {
    const response = await fetch(`${GUTENDEX_API}?ids=${encodeURIComponent(parsed.sourceId)}`, {
      next: { revalidate: 60 * 60 * 12 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Gutendex returned ${response.status}.`);
    const data = (await response.json()) as { results: GutendexBook[] };
    const book = data.results[0] ? mapGutendexBook(data.results[0]) : fallback;
    return book || null;
  } catch {
    return fallback || null;
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const book = await getBook(params.id);

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  if (book.fullText?.trim()) {
    return NextResponse.json({
      book,
      text: cleanBookText(book.fullText),
      truncated: false,
      sourceUrl: book.sourceUrl,
    });
  }

  if (!book.textUrl) {
    return NextResponse.json(
      {
        error: "This title does not expose a readable plain-text source. Open the source reader or download the original file instead.",
        book,
      },
      { status: 404 },
    );
  }

  try {
    const response = await fetch(book.textUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error(`Book source returned ${response.status}.`);
    }

    const rawText = cleanBookText(await response.text());
    const truncated = rawText.length > MAX_READER_CHARS;
    const text = truncated
      ? `${rawText.slice(0, MAX_READER_CHARS)}\n\n[Reader note: this is a very large book. Use the offline book download for the complete original file.]`
      : rawText;

    return NextResponse.json({
      book,
      text,
      truncated,
      sourceUrl: book.sourceUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load this book for online reading.",
        book,
      },
      { status: 502 },
    );
  }
}
