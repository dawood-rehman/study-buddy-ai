import { NextRequest, NextResponse } from "next/server";
import {
  BookSearchResponse,
  fallbackBooks,
  featuredBookIds,
  findBookCategory,
  findBookLanguage,
  GutendexListResponse,
  mapGutendexBook,
} from "@/lib/books";
import { getCustomBooks } from "@/lib/server/books";

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() || "";
  const category = findBookCategory(searchParams.get("category"));
  const language = findBookLanguage(searchParams.get("language"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const adminBooks = await loadAdminBooks(query, category.id, language.id);
  const useGutenberg = language.id !== "roman-ur";
  const shouldUseFallback = language.id === "all" && category.id === "all" && !query;

  if (!useGutenberg) {
    const payload: BookSearchResponse = {
      books: adminBooks,
      count: adminBooks.length,
      nextPage: null,
      previousPage: null,
      source: "Admin Library / Roman Urdu exact filter",
    };

    return NextResponse.json(payload);
  }

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
    const gutenbergBooks = data.results
      .map((book) => mapGutendexBook(book, category.label))
      .filter((book) => {
        if (!(book.textUrl || book.htmlUrl || book.epubUrl || book.pdfUrl)) return false;
        if (language.id === "all") return true;
        return book.languages.includes(language.id) || book.languages.includes(language.gutendexCode || "");
      });

    const books = page === 1 ? [...adminBooks, ...gutenbergBooks] : gutenbergBooks;
    const fallback = shouldUseFallback && !books.length ? fallbackBooks : [];
    const payload: BookSearchResponse = {
      books: books.length ? books : fallback,
      count: data.count + adminBooks.length || books.length || fallback.length,
      nextPage: pageFromUrl(data.next),
      previousPage: pageFromUrl(data.previous),
      source: adminBooks.length ? "Admin Library + Gutendex / Project Gutenberg" : "Gutendex / Project Gutenberg",
    };

    return NextResponse.json(payload);
  } catch (error) {
    const fallback = shouldUseFallback ? fallbackBooks : adminBooks;
    const payload: BookSearchResponse = {
      books: fallback,
      count: fallback.length,
      nextPage: null,
      previousPage: null,
      source: error instanceof Error ? `Offline fallback: ${error.message}` : "Offline fallback",
    };

    return NextResponse.json(payload, { status: 200 });
  }
}
