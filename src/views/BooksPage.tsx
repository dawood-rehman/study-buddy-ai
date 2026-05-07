"use client";

import { useMemo, useState } from "react";
import { BookMarked, BookmarkPlus, Download, Search, Star } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { addLibraryItem } from "@/lib/library-store";

const books = [
  { title: "A Brief History of Time", author: "Stephen Hawking", genre: "Science", popular: true, desc: "An accessible guide to cosmology and the universe." },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "History", popular: true, desc: "A sweeping history of humankind from the Stone Age to modern times." },
  { title: "The Elements of Style", author: "Strunk & White", genre: "English", popular: true, desc: "A classic guide to writing clear, effective English." },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "Psychology", popular: true, desc: "Explores the two systems that drive the way we think." },
  { title: "Introduction to Algorithms", author: "Cormen et al.", genre: "Computer Science", popular: true, desc: "A standard textbook for learning algorithms and data structures." },
  { title: "Organic Chemistry", author: "Morrison & Boyd", genre: "Chemistry", popular: false, desc: "A comprehensive guide to organic chemistry concepts." },
  { title: "Principles of Economics", author: "N. Gregory Mankiw", genre: "Economics", popular: false, desc: "Widely used introduction to economic principles." },
  { title: "Campbell Biology", author: "Urry et al.", genre: "Biology", popular: false, desc: "A trusted biology textbook for core concepts and diagrams." },
  { title: "Atomic Habits", author: "James Clear", genre: "Productivity", popular: true, desc: "Practical behavior-change systems for consistent study routines." },
  { title: "Deep Work", author: "Cal Newport", genre: "Productivity", popular: false, desc: "Focus strategies for high-value learning and knowledge work." },
];

const genres = ["All", ...Array.from(new Set(books.map((book) => book.genre)))];

export default function BooksPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [activeBook, setActiveBook] = useState(books[0]);

  const filteredBooks = useMemo(() => {
    const searchable = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery = !searchable || [book.title, book.author, book.genre, book.desc].join(" ").toLowerCase().includes(searchable);
      const matchesGenre = genre === "All" || book.genre === genre;
      return matchesQuery && matchesGenre;
    });
  }, [genre, query]);

  const recommendedBooks = useMemo(() => {
    if (genre !== "All") return books.filter((book) => book.genre === genre).slice(0, 3);
    return books.filter((book) => book.popular).slice(0, 4);
  }, [genre]);

  const saveBook = async (book: typeof books[number]) => {
    try {
      await addLibraryItem({
        type: "book",
        title: book.title,
        source: "Books",
        content: `${book.title}\nby ${book.author}\nGenre: ${book.genre}\n\n${book.desc}`,
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

  const downloadBookInfo = async (book: typeof books[number]) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 54;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(book.title, margin, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`by ${book.author}`, margin, y);
    y += 18;
    doc.text(`Genre: ${book.genre}`, margin, y);
    y += 26;
    doc.splitTextToSize(book.desc, maxWidth).forEach((line: string) => {
      doc.text(line, margin, y);
      y += 16;
    });
    y += 14;
    doc.setFont("helvetica", "italic");
    doc.text("Add licensed/public-domain source content before distributing full book PDFs.", margin, y, { maxWidth });
    doc.save(`${book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  };

  return (
    <AuthGate title="Login required for Books" description="Login to search, save, read, and download book resources.">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader icon={BookMarked} title="Books" description="Search, filter, read, save, and organize recommended learning books" />

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, author, genre, or topic..." className="pl-10" />
          </div>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {genres.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Popular & Recommended</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recommendedBooks.map((book) => (
              <button key={book.title} onClick={() => setActiveBook(book)} className="glass-card p-4 text-left transition-all hover:-translate-y-0.5">
                <span className="mb-2 inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{book.genre}</span>
                <h3 className="font-display font-semibold text-foreground">{book.title}</h3>
                <p className="mt-1 text-xs text-primary">by {book.author}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredBooks.map((book) => (
              <div key={book.title} className="glass-card p-5">
                <span className="mb-3 inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{book.genre}</span>
                <h3 className="font-display font-semibold text-foreground">{book.title}</h3>
                <p className="mt-1 text-sm font-medium text-primary">by {book.author}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{book.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveBook(book)}>Read Online</Button>
                  <Button variant="outline" size="sm" onClick={() => saveBook(book)}>
                    <BookmarkPlus className="mr-2 h-4 w-4" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadBookInfo(book)}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <aside className="glass-card p-5">
            <h2 className="mb-1 font-display text-lg font-semibold text-foreground">{activeBook.title}</h2>
            <p className="mb-4 text-sm text-primary">by {activeBook.author}</p>
            <div className="rounded-md border border-border bg-background p-4 text-sm leading-7 text-muted-foreground">
              <p className="mb-3 font-medium text-foreground">Online reading preview</p>
              <p>{activeBook.desc}</p>
              <p className="mt-3">
                This reader area is ready for licensed/public-domain book content or an external book API. Saved books appear automatically in your library.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
