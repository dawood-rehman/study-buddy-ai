import { NextRequest } from "next/server";
import { jsPDF } from "jspdf";
import { fallbackBooks, fileSafeName, getBookDescription, GutendexBook, LibraryBook, mapGutendexBook, parseBookId } from "@/lib/books";
import { getCustomBookById } from "@/lib/server/books";

export const runtime = "nodejs";

const GUTENDEX_API = "https://gutendex.com/books/";
const IA_METADATA_API = "https://archive.org/metadata/";
const MAX_PDF_CHARS = 2_000_000;

function cleanBookText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
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

function addWrappedText(doc: jsPDF, text: string, state: { y: number }, options?: { fontSize?: number; bold?: boolean; italic?: boolean }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = options?.fontSize || 10;
  const lineHeight = Math.max(12, fontSize * 1.35);

  doc.setFontSize(fontSize);
  doc.setFont("times", options?.bold ? "bold" : options?.italic ? "italic" : "normal");

  const paragraphs = text.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const normalized = paragraph.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const lines = doc.splitTextToSize(normalized, maxWidth);

    for (const line of lines) {
      if (state.y + lineHeight > pageHeight - margin) {
        doc.addPage();
        state.y = margin;
      }

      doc.text(line, margin, state.y);
      state.y += lineHeight;
    }

    state.y += lineHeight * 0.6;
  }
}

async function fetchText(bookTextUrl?: string) {
  if (!bookTextUrl) return "";
  const sourceResponse = await fetch(bookTextUrl, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!sourceResponse.ok) {
    throw new Error(`Book source returned ${sourceResponse.status}.`);
  }

  return cleanBookText(await sourceResponse.text());
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const book = await getBook(params.id);
  const format = request.nextUrl.searchParams.get("format") || "pdf";

  if (!book) {
    return new Response("Book not found.", { status: 404 });
  }

  if (format === "original") {
    const originalUrl = book.pdfUrl || book.epubUrl || book.textUrl || book.htmlUrl || book.sourceUrl;
    if (!originalUrl) return new Response("No original download source is available for this book.", { status: 404 });
    const redirectUrl = originalUrl.startsWith("/api/books/files/") ? `${originalUrl}?download=1` : originalUrl;
    return Response.redirect(new URL(redirectUrl, request.url), 302);
  }

  if (book.pdfUrl && !book.fullText && !book.textUrl) {
    return Response.redirect(book.pdfUrl, 302);
  }

  if (!book.fullText && !book.textUrl) {
    return new Response("This book does not expose text for PDF generation. Download the original file instead.", { status: 404 });
  }

  try {
    const rawText = book.fullText ? cleanBookText(book.fullText) : await fetchText(book.textUrl);
    const truncated = rawText.length > MAX_PDF_CHARS;
    const text = truncated
      ? `${rawText.slice(0, MAX_PDF_CHARS)}\n\nReader note: this title is very large. The complete original offline file is available from the Offline Book button or source page.`
      : rawText;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const state = { y: 58 };

    doc.setTextColor(18, 18, 18);
    addWrappedText(doc, book.title, state, { fontSize: 20, bold: true });
    addWrappedText(doc, `by ${book.authors.join(", ")}`, state, { fontSize: 12, italic: true });
    if (book.sourceUrl) addWrappedText(doc, `Source: ${book.sourceUrl}`, state, { fontSize: 9 });
    addWrappedText(doc, `About: ${getBookDescription(book)}`, state, { fontSize: 10 });
    addWrappedText(doc, "Full Book Text", state, { fontSize: 14, bold: true });
    addWrappedText(doc, text, state, { fontSize: 10 });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text(`${book.title} - ${page} / ${pageCount}`, 44, doc.internal.pageSize.getHeight() - 22);
    }

    const pdf = doc.output("arraybuffer");
    const suffix = truncated ? "-reader-edition" : "";

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileSafeName(book.title)}${suffix}.pdf"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Could not generate the PDF.", { status: 502 });
  }
}
