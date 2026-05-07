"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, BookOpen, BookmarkPlus, Download, ExternalLink, FileDown, Loader2, Search, Star } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { BookSearchResponse, LibraryBook, bookCategories, getBookDescription } from "@/lib/books";
import { addLibraryItem } from "@/lib/library-store";

type ReaderState = "idle" | "loading" | "ready" | "error";

function authorLine(book: LibraryBook) {
  return book.authors.filter(Boolean).join(", ") || "Unknown author";
}

function subjectPreview(book: LibraryBook) {
  const items = [...book.subjects, ...book.bookshelves].filter(Boolean);
  return items.slice(0, 3);
}

export default function BooksPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [activeBook, setActiveBook] = useState<LibraryBook | null>(null);
  const [readerText, setReaderText] = useState("");
  const [readerState, setReaderState] = useState<ReaderState>("idle");
  const [readerTruncated, setReaderTruncated] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [previousPage, setPreviousPage] = useState<number | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Project Gutenberg");
  const readerRef = useRef<HTMLDivElement | null>(null);

  const categoryInfo = useMemo(() => bookCategories.find((item) => item.id === category) || bookCategories[0], [category]);
  const popularBooks = useMemo(() => books.slice(0, 4), [books]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          category,
          page: String(page),
        });

        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(`/api/books?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load the library right now.");
        }

        const data = (await response.json()) as BookSearchResponse;
        setBooks(data.books);
        setNextPage(data.nextPage);
        setPreviousPage(data.previousPage);
        setSourceLabel(data.source);

        setActiveBook((current) => current || data.books[0] || null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Book search failed", {
            description: error instanceof Error ? error.message : "Try again in a moment.",
          });
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [category, page, query]);

  const openReader = async (book: LibraryBook) => {
    setActiveBook(book);
    setReaderText("");
    setReaderTruncated(false);
    setReaderState("loading");
    requestAnimationFrame(() => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

    try {
      const response = await fetch(`/api/books/${book.id}/read`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "This book could not be opened in the reader.");
      }

      setReaderText(data.text);
      setReaderTruncated(Boolean(data.truncated));
      setReaderState("ready");
    } catch (error) {
      setReaderState("error");
      setReaderText(error instanceof Error ? error.message : "This book could not be opened in the reader.");
    }
  };

  const saveBook = async (book: LibraryBook) => {
    try {
      await addLibraryItem({
        type: "book",
        title: book.title,
        source: "Books",
        content: [
          book.title,
          `by ${authorLine(book)}`,
          `Source: ${book.sourceUrl}`,
          `Read online: ${book.htmlUrl || book.sourceUrl}`,
          `Download EPUB/TXT: ${book.epubUrl || book.textUrl || book.sourceUrl}`,
          "",
          getBookDescription(book),
        ].join("\n"),
      });

      toast.success("Book saved", {
        description: "Added to Saved Books in your library.",
      });
    } catch (error) {
      toast.error("Book save failed", {
        description: error instanceof Error ? error.message : "Could not save book.",
      });
    }
  };

  const downloadPdf = (book: LibraryBook) => {
    window.location.href = `/api/books/${book.id}/download`;
  };

  const downloadOriginal = (book: LibraryBook) => {
    window.location.href = `/api/books/${book.id}/download?format=original`;
  };

  return (
    <AuthGate title="Login required for Books" description="Login to search, save, read online, and download offline book resources.">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader icon={BookMarked} title="Books" description="A public-domain online/offline library powered by Project Gutenberg sources" />

        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
                setActiveBook(null);
                setReaderState("idle");
              }}
              placeholder="Search novels, Urdu, poems, suspense, kids stories, drama, country, action, romance..."
              className="pl-10"
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value);
              setPage(1);
              setActiveBook(null);
              setReaderState("idle");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bookCategories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-6 rounded-md border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">{categoryInfo.label}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{categoryInfo.description}</p>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{sourceLabel}</p>
          </div>
        </div>

        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Popular & Recommended</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {popularBooks.map((book) => (
              <button key={`popular-${book.id}`} onClick={() => void openReader(book)} className="glass-card p-4 text-left transition-all hover:-translate-y-0.5">
                <span className="mb-2 inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {book.categoryLabel}
                </span>
                <h3 className="line-clamp-2 font-display font-semibold text-foreground">{book.title}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-primary">by {authorLine(book)}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-semibold text-foreground">Library Results</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!previousPage || isSearching} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <span className="min-w-12 text-center text-xs font-medium text-muted-foreground">Page {page}</span>
                <Button variant="outline" size="sm" disabled={!nextPage || isSearching} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>

            {isSearching ? (
              <div className="glass-card flex min-h-[260px] items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {books.map((book) => (
                  <article key={book.id} className="glass-card overflow-hidden">
                    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 p-4">
                      <div className="aspect-[2/3] overflow-hidden rounded-md border border-border bg-secondary">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {book.categoryLabel}
                          </span>
                          <span className="inline-flex rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {book.estimatedPages || "Full book"}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 font-display font-semibold text-foreground">{book.title}</h3>
                        <p className="mt-1 line-clamp-1 text-sm font-medium text-primary">by {authorLine(book)}</p>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{getBookDescription(book)}</p>
                      </div>
                    </div>
                    <div className="border-t border-border px-4 py-3">
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {subjectPreview(book).map((subject) => (
                          <span key={`${book.id}-${subject}`} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {subject}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => void openReader(book)}>
                          <BookOpen className="mr-2 h-4 w-4" /> Read Online
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(book)}>
                          <FileDown className="mr-2 h-4 w-4" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadOriginal(book)}>
                          <Download className="mr-2 h-4 w-4" /> Book
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => saveBook(book)}>
                          <BookmarkPlus className="mr-2 h-4 w-4" /> Save
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside ref={readerRef} className="glass-card p-5 xl:sticky xl:top-20 xl:self-start">
            {activeBook ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">{activeBook.title}</h2>
                    <p className="mt-1 text-sm text-primary">by {authorLine(activeBook)}</p>
                  </div>
                  <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{activeBook.categoryLabel}</span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void openReader(activeBook)} disabled={readerState === "loading"}>
                    {readerState === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                    Load Full Reader
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPdf(activeBook)}>
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadOriginal(activeBook)}>
                    <Download className="mr-2 h-4 w-4" /> Offline Book
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={activeBook.htmlUrl || activeBook.sourceUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Source
                    </a>
                  </Button>
                </div>

                <div className="max-h-[660px] overflow-y-auto rounded-md border border-border bg-background p-4">
                  {readerState === "loading" ? (
                    <div className="flex min-h-[360px] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : readerState === "ready" ? (
                    <>
                      {readerTruncated ? (
                        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm leading-6 text-yellow-900">
                          This is a very large book, so the in-app reader shows a large readable section. Use Offline Book for the complete original file.
                        </div>
                      ) : null}
                      <pre className="whitespace-pre-wrap break-words font-serif text-sm leading-7 text-foreground">{readerText}</pre>
                    </>
                  ) : readerState === "error" ? (
                    <div className="text-sm leading-6 text-muted-foreground">
                      <p>{readerText}</p>
                      <a className="mt-3 inline-flex items-center font-medium text-primary hover:underline" href={activeBook.sourceUrl} target="_blank" rel="noreferrer">
                        Open Project Gutenberg source <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                      <p>{getBookDescription(activeBook)}</p>
                      <p>Click Read Online to load the full public-domain text inside the reader. Use PDF or Offline Book to download it for later reading.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center text-center">
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">Search the library and open any public-domain title to read or download.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
