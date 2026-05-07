import { NextRequest, NextResponse } from "next/server";
import { fallbackBooks, GutendexBook, mapGutendexBook, parseBookId } from "@/lib/books";
import { getCustomBookById } from "@/lib/server/books";

const GUTENDEX_API = "https://gutendex.com/books/";
const MAX_READER_CHARS = 1_800_000;

function cleanBookText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
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
