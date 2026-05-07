import { BookMarked, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const books = [
  { title: "A Brief History of Time", author: "Stephen Hawking", subject: "Physics", desc: "An accessible guide to cosmology and the universe." },
  { title: "Sapiens", author: "Yuval Noah Harari", subject: "History", desc: "A sweeping history of humankind from the Stone Age to modern times." },
  { title: "The Elements of Style", author: "Strunk & White", subject: "English", desc: "A classic guide to writing clear, effective English." },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", subject: "Psychology", desc: "Explores the two systems that drive the way we think." },
  { title: "Introduction to Algorithms", author: "Cormen et al.", subject: "Computer Science", desc: "The definitive textbook for learning algorithms and data structures." },
  { title: "Organic Chemistry", author: "Morrison & Boyd", subject: "Chemistry", desc: "A comprehensive guide to organic chemistry concepts." },
  { title: "Principles of Economics", author: "N. Gregory Mankiw", subject: "Economics", desc: "Widely used introduction to economic principles." },
  { title: "Campbell Biology", author: "Urry et al.", subject: "Biology", desc: "The most trusted biology textbook worldwide." },
];

export default function BooksPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader icon={BookMarked} title="Recommended Books" description="Curated books by top authors across subjects" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {books.map((book) => (
          <div key={book.title} className="glass-card p-5 group">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium px-2 py-0.5 bg-secondary text-secondary-foreground rounded">{book.subject}</span>
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1">{book.title}</h3>
            <p className="text-sm text-primary font-medium mb-2">by {book.author}</p>
            <p className="text-sm text-muted-foreground">{book.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
