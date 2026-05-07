import { NextRequest, NextResponse } from "next/server";
import {
  BookSearchResponse,
  fallbackBooks,
  featuredBookIds,
  findBookCategory,
  GutendexListResponse,
  mapGutendexBook,
} from "@/lib/books";

const GUTENDEX_API = "https://gutendex.com/books/";

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() || "";
  const category = findBookCategory(searchParams.get("category"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const url = new URL(GUTENDEX_API);

  url.searchParams.set("copyright", "false");
  url.searchParams.set("mime_type", "text/plain");
  url.searchParams.set("page", String(page));

  if (!query && category.id === "all" && page === 1) {
    url.searchParams.set("ids", featuredBookIds.join(","));
  } else {
    if (query) url.searchParams.set("search", query);
    if (category.topic) url.searchParams.set("topic", category.topic);
    if (category.languages) url.searchParams.set("languages", category.languages);
    if (!query && category.search) url.searchParams.set("search", category.search);
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 * 60 * 12 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Gutendex returned ${response.status}.`);
    }

    const data = (await response.json()) as GutendexListResponse;
    const books = data.results.map((book) => mapGutendexBook(book, category.label)).filter((book) => book.textUrl || book.htmlUrl || book.epubUrl);

    const payload: BookSearchResponse = {
      books: books.length ? books : fallbackBooks,
      count: data.count || books.length,
      nextPage: pageFromUrl(data.next),
      previousPage: pageFromUrl(data.previous),
      source: "Gutendex / Project Gutenberg",
    };

    return NextResponse.json(payload);
  } catch (error) {
    const payload: BookSearchResponse = {
      books: fallbackBooks,
      count: fallbackBooks.length,
      nextPage: null,
      previousPage: null,
      source: error instanceof Error ? `Offline fallback: ${error.message}` : "Offline fallback",
    };

    return NextResponse.json(payload, { status: 200 });
  }
}
