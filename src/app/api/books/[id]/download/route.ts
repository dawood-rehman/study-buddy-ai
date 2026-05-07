import { NextRequest } from "next/server";
import { jsPDF } from "jspdf";
import { fallbackBooks, fileSafeName, getBookDescription, GutendexBook, mapGutendexBook } from "@/lib/books";

export const runtime = "nodejs";

const GUTENDEX_API = "https://gutendex.com/books/";
const MAX_PDF_CHARS = 1_800_000;

function cleanBookText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function getBook(id: string) {
  const fallback = fallbackBooks.find((book) => String(book.id) === id);

  try {
    const response = await fetch(`${GUTENDEX_API}?ids=${encodeURIComponent(id)}`, {
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
    const lines = doc.splitTextToSize(paragraph.replace(/\s+/g, " ").trim(), maxWidth);

    if (!lines.length) {
      state.y += lineHeight;
      continue;
    }

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const book = await getBook(params.id);
  const format = request.nextUrl.searchParams.get("format") || "pdf";

  if (!book) {
    return new Response("Book not found.", { status: 404 });
  }

  if (format === "original") {
    const originalUrl = book.epubUrl || book.textUrl || book.htmlUrl || book.sourceUrl;
    return Response.redirect(originalUrl, 302);
  }

  if (!book.textUrl) {
    return new Response("This book does not expose a plain text source for PDF generation. Download the original file instead.", { status: 404 });
  }

  try {
    const sourceResponse = await fetch(book.textUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!sourceResponse.ok) {
      throw new Error(`Book source returned ${sourceResponse.status}.`);
    }

    const rawText = cleanBookText(await sourceResponse.text());
    const truncated = rawText.length > MAX_PDF_CHARS;
    const text = truncated
      ? `${rawText.slice(0, MAX_PDF_CHARS)}\n\nReader note: this title is very large. The complete original offline file is available from the Download Original button or Project Gutenberg source page.`
      : rawText;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const state = { y: 58 };

    doc.setTextColor(18, 18, 18);
    addWrappedText(doc, book.title, state, { fontSize: 20, bold: true });
    addWrappedText(doc, `by ${book.authors.join(", ")}`, state, { fontSize: 12, italic: true });
    addWrappedText(doc, `Source: ${book.sourceUrl}`, state, { fontSize: 9 });
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
