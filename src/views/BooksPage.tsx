"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, BookMarked, BookmarkPlus, Download, Search, Star } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { addLibraryItem } from "@/lib/library-store";

type Book = {
  title: string;
  author: string;
  genre: string;
  popular: boolean;
  desc: string;
  availability: "public-domain" | "preview-guide";
  tags: string[];
  reader: string[];
};

const books: Book[] = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    genre: "Novel",
    popular: true,
    availability: "public-domain",
    tags: ["classic", "romance", "society", "english literature"],
    desc: "A classic novel about family, manners, judgment, and social expectations.",
    reader: [
      "Pride and Prejudice follows Elizabeth Bennet as she studies character, pride, class, and first impressions. The story is useful for readers who want elegant English prose, social observation, and memorable dialogue.",
      "Reading focus: notice how Austen reveals personality through conversation. Pay attention to indirect criticism, irony, and how small misunderstandings grow into larger conflicts.",
      "Study prompt: list three moments where Elizabeth changes her opinion. What evidence changes her mind?",
    ],
  },
  {
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    genre: "Mystery",
    popular: true,
    availability: "public-domain",
    tags: ["detective", "logic", "crime", "short stories"],
    desc: "Detective stories built around observation, deduction, and clever problem solving.",
    reader: [
      "Sherlock Holmes stories are compact mysteries that train attention to detail. Holmes observes small facts, connects them to human behavior, and tests explanations before reaching a conclusion.",
      "Reading focus: separate clues from assumptions. Write down what is directly observed and what is only guessed.",
      "Practice: after each scene, pause and predict the explanation before reading Holmes's reasoning.",
    ],
  },
  {
    title: "Leaves of Grass",
    author: "Walt Whitman",
    genre: "Poetry",
    popular: true,
    availability: "public-domain",
    tags: ["poems", "free verse", "identity", "nature"],
    desc: "A poetry collection known for free verse, self-expression, nature, and democracy.",
    reader: [
      "Leaves of Grass is a major free-verse poetry collection. It is useful for learning rhythm without fixed rhyme and for studying how repetition can build emotional force.",
      "Reading focus: mark repeated words, images of the body, and references to nature. Ask how the speaker connects the self with the wider world.",
      "Writing task: write six free-verse lines about an ordinary place using repetition and sensory detail.",
    ],
  },
  {
    title: "The Prophet",
    author: "Kahlil Gibran",
    genre: "Philosophy",
    popular: true,
    availability: "public-domain",
    tags: ["wisdom", "poetic prose", "life", "spiritual"],
    desc: "Poetic essays on love, work, freedom, teaching, joy, sorrow, and life.",
    reader: [
      "The Prophet uses poetic prose to explore common human experiences. Each section can be read slowly as reflective writing rather than as a conventional story.",
      "Reading focus: choose one topic, such as work or friendship, and summarize the central idea in one sentence.",
      "Reflection: write how the idea applies to your study life, family life, or career goals.",
    ],
  },
  {
    title: "The Elements of Style",
    author: "William Strunk Jr.",
    genre: "Writing",
    popular: true,
    availability: "public-domain",
    tags: ["english", "grammar", "writing", "style"],
    desc: "A compact guide to writing clear, direct English.",
    reader: [
      "This guide teaches concise writing. Its main value is not fancy language; it is discipline: remove unnecessary words, prefer clear structure, and make every sentence carry useful meaning.",
      "Reading focus: revise one paragraph from your own writing. Cut repeated words, replace vague verbs, and move the main idea to the front.",
      "Practice: rewrite a long sentence into two shorter sentences without losing meaning.",
    ],
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    genre: "Science",
    popular: true,
    availability: "preview-guide",
    tags: ["physics", "cosmology", "space", "black holes"],
    desc: "An accessible guide to cosmology, black holes, time, and the universe.",
    reader: [
      "Reading guide: this book explains big physics ideas for general readers. Start with the questions: What is time? How did the universe begin? What are black holes?",
      "Study focus: write definitions for universe, gravity, black hole, singularity, and time arrow. Keep each definition simple enough for a classmate.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "Introduction to Algorithms",
    author: "Cormen, Leiserson, Rivest, and Stein",
    genre: "Computer Science",
    popular: true,
    availability: "preview-guide",
    tags: ["algorithms", "data structures", "programming", "cs"],
    desc: "A standard reference for algorithms, data structures, and complexity.",
    reader: [
      "Reading guide: approach algorithms by pattern, not memorization. For every algorithm, identify input, output, invariant, complexity, and edge cases.",
      "Practice plan: implement binary search, merge sort, breadth-first search, and dynamic programming examples from scratch.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    genre: "Productivity",
    popular: true,
    availability: "preview-guide",
    tags: ["habits", "self help", "discipline", "study routine"],
    desc: "A practical behavior-change system for building consistent routines.",
    reader: [
      "Reading guide: focus on the habit loop: cue, craving, response, and reward. For students, the most useful application is making study actions easier to start.",
      "Study task: choose one weak subject and create a two-minute starting habit, such as opening notes and solving one example.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    genre: "History",
    popular: true,
    availability: "preview-guide",
    tags: ["history", "humanity", "culture", "civilization"],
    desc: "A broad history of humankind, culture, cooperation, and social change.",
    reader: [
      "Reading guide: treat this as a big-picture history argument. Track claims, evidence, and examples separately.",
      "Study focus: create a timeline of major transitions: cognitive, agricultural, imperial, scientific, and industrial.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    genre: "Psychology",
    popular: true,
    availability: "preview-guide",
    tags: ["psychology", "decision making", "bias", "mind"],
    desc: "A guide to quick intuitive thinking, slow reasoning, and cognitive bias.",
    reader: [
      "Reading guide: separate System 1 automatic thinking from System 2 deliberate thinking. Notice how bias affects exams, planning, and career decisions.",
      "Practice: write one recent decision and identify whether it was mostly fast intuition or slow analysis.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "The Richest Man in Babylon",
    author: "George S. Clason",
    genre: "Finance",
    popular: false,
    availability: "public-domain",
    tags: ["money", "saving", "personal finance", "business"],
    desc: "Simple financial lessons told through parables about saving and wealth building.",
    reader: [
      "This book teaches personal finance through short parables. Its core lessons are simple: save regularly, control spending, invest carefully, and build earning ability.",
      "Reading focus: convert each parable into one action rule. Keep the rule short and measurable.",
      "Practice: create a student budget with saving, learning, transport, food, and emergency categories.",
    ],
  },
  {
    title: "Business Adventures",
    author: "John Brooks",
    genre: "Business",
    popular: false,
    availability: "preview-guide",
    tags: ["business", "companies", "management", "case studies"],
    desc: "Business case stories about markets, leadership, mistakes, and decision making.",
    reader: [
      "Reading guide: study each story as a business case. Identify the decision, risk, stakeholders, and final result.",
      "Practice: write a one-page case brief with problem, options, decision, outcome, and lesson.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "The Blue Fairy Book",
    author: "Andrew Lang",
    genre: "Fantasy",
    popular: false,
    availability: "public-domain",
    tags: ["fairy tales", "fantasy", "stories", "children"],
    desc: "A classic collection of fairy tales, fantasy stories, and folklore.",
    reader: [
      "The Blue Fairy Book gathers fantasy tales with quests, tests, helpers, and moral choices. It is useful for vocabulary, imagination, and story structure.",
      "Reading focus: identify the hero, challenge, helper, turning point, and lesson in each story.",
      "Creative task: rewrite one tale in a modern school or city setting.",
    ],
  },
  {
    title: "A Child's Garden of Verses",
    author: "Robert Louis Stevenson",
    genre: "Children",
    popular: false,
    availability: "public-domain",
    tags: ["poems", "children", "rhythm", "simple english"],
    desc: "A poetry collection with simple imagery, rhythm, childhood, and imagination.",
    reader: [
      "This collection is helpful for pronunciation and rhythm practice. The poems are short, visual, and easy to read aloud.",
      "Reading focus: clap the rhythm, underline rhyming words, and practice clear pronunciation.",
      "Speaking task: read one stanza aloud twice, first slowly and then naturally.",
    ],
  },
  {
    title: "Meditations",
    author: "Marcus Aurelius",
    genre: "Philosophy",
    popular: true,
    availability: "public-domain",
    tags: ["stoic", "discipline", "reflection", "life"],
    desc: "Personal reflections on discipline, responsibility, emotion, and character.",
    reader: [
      "Meditations is a collection of private reflections. It is best read slowly, one idea at a time.",
      "Reading focus: look for ideas about what is in your control and what is not in your control.",
      "Practice: write a short daily reflection about one difficulty and one controlled action you can take.",
    ],
  },
  {
    title: "The Autobiography of Benjamin Franklin",
    author: "Benjamin Franklin",
    genre: "Biography",
    popular: false,
    availability: "public-domain",
    tags: ["life story", "self improvement", "history", "leadership"],
    desc: "A life story focused on learning, habits, work, and public service.",
    reader: [
      "This autobiography shows how Franklin built skills through reading, writing, practical work, and deliberate habits.",
      "Reading focus: track the habits he builds and the opportunities created by communication skills.",
      "Study task: choose one skill and design a four-week improvement routine.",
    ],
  },
  {
    title: "Selected Poems",
    author: "Emily Dickinson",
    genre: "Poetry",
    popular: false,
    availability: "public-domain",
    tags: ["poetry", "short poems", "imagery", "meaning"],
    desc: "Compact poems known for compressed meaning, imagery, and surprising turns.",
    reader: [
      "Dickinson's poems often say a lot with very few words. They are useful for close reading and interpretation practice.",
      "Reading focus: identify the central image, emotional tone, and final turn in meaning.",
      "Practice: paraphrase a poem in plain English, then write one question it leaves open.",
    ],
  },
  {
    title: "Principles of Economics",
    author: "N. Gregory Mankiw",
    genre: "Economics",
    popular: false,
    availability: "preview-guide",
    tags: ["economics", "markets", "trade", "policy"],
    desc: "An introduction to economic principles, markets, incentives, and policy.",
    reader: [
      "Reading guide: focus on incentives, opportunity cost, supply and demand, and trade-offs. Draw simple graphs instead of only reading definitions.",
      "Practice: explain one real-life decision using opportunity cost.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "Campbell Biology",
    author: "Urry et al.",
    genre: "Biology",
    popular: false,
    availability: "preview-guide",
    tags: ["biology", "cells", "genetics", "life science"],
    desc: "A detailed biology reference for cells, genetics, evolution, and organisms.",
    reader: [
      "Reading guide: biology is easier when you connect structure and function. For every diagram, ask what each part does.",
      "Study focus: make concept maps for cells, DNA, enzymes, evolution, and ecosystems.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
  {
    title: "Organic Chemistry",
    author: "Morrison & Boyd",
    genre: "Chemistry",
    popular: false,
    availability: "preview-guide",
    tags: ["chemistry", "reactions", "organic", "science"],
    desc: "A chemistry guide for structure, reactions, mechanisms, and practice problems.",
    reader: [
      "Reading guide: do not memorize reactions alone. Track electron movement, functional groups, reagents, and reaction conditions.",
      "Practice: make reaction cards with reactant, reagent, product, mechanism clue, and common mistake.",
      "Note: this app provides a study guide/preview, not the copyrighted full text.",
    ],
  },
];

const genres = ["All", ...Array.from(new Set(books.map((book) => book.genre))).sort()];

function fileSafeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function BooksPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [activeBook, setActiveBook] = useState(books[0]);
  const readerRef = useRef<HTMLDivElement | null>(null);

  const filteredBooks = useMemo(() => {
    const searchable = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery = !searchable || [book.title, book.author, book.genre, book.desc, ...book.tags].join(" ").toLowerCase().includes(searchable);
      const matchesGenre = genre === "All" || book.genre === genre;
      return matchesQuery && matchesGenre;
    });
  }, [genre, query]);

  const recommendedBooks = useMemo(() => {
    if (genre !== "All") return books.filter((book) => book.genre === genre).slice(0, 4);
    return books.filter((book) => book.popular).slice(0, 4);
  }, [genre]);

  const openReader = (book: Book) => {
    setActiveBook(book);
    requestAnimationFrame(() => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const saveBook = async (book: Book) => {
    try {
      await addLibraryItem({
        type: "book",
        title: book.title,
        source: "Books",
        content: `${book.title}\nby ${book.author}\nGenre: ${book.genre}\n\n${book.reader.join("\n\n")}`,
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

  const downloadBookInfo = async (book: Book) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = 54;

    const ensureSpace = (height = 22) => {
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addWrapped = (text: string, fontSize = 11, lineGap = 16) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        ensureSpace(lineGap);
        doc.text(line, margin, y);
        y += lineGap;
      });
    };

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(book.title, margin, y);
    y += 25;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`by ${book.author}`, margin, y);
    y += 18;
    doc.text(`Genre: ${book.genre}`, margin, y);
    y += 18;
    doc.text(`Availability: ${book.availability === "public-domain" ? "Public-domain reading pack" : "Study guide / preview pack"}`, margin, y);
    y += 28;

    doc.setFont("helvetica", "bold");
    addWrapped("Overview", 13, 18);
    doc.setFont("helvetica", "normal");
    addWrapped(book.desc);
    y += 10;

    doc.setFont("helvetica", "bold");
    addWrapped("Read Online Content", 13, 18);
    doc.setFont("helvetica", "normal");
    book.reader.forEach((paragraph, index) => {
      addWrapped(`${index + 1}. ${paragraph}`, 11, 16);
      y += 8;
    });

    doc.setFont("helvetica", "italic");
    addWrapped(
      book.availability === "public-domain"
        ? "This PDF contains the app reading pack for a public-domain title. Add a full public-domain text source if you want full-book downloads."
        : "This PDF contains a study guide and preview only. The full copyrighted book is not redistributed by this app.",
      10,
      14,
    );

    doc.save(`${fileSafeName(book.title)}.pdf`);
  };

  return (
    <AuthGate title="Login required for Books" description="Login to search, save, read, and download book resources.">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader icon={BookMarked} title="Books" description="Search study books, novels, poems, classics, business, and more" />

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, novels, poems, authors, genres, or topics..." className="pl-10" />
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
              <button key={book.title} onClick={() => openReader(book)} className="glass-card p-4 text-left transition-all hover:-translate-y-0.5">
                <span className="mb-2 inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{book.genre}</span>
                <h3 className="font-display font-semibold text-foreground">{book.title}</h3>
                <p className="mt-1 text-xs text-primary">by {book.author}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredBooks.map((book) => (
              <div key={book.title} className="glass-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{book.genre}</span>
                  <span className="inline-flex rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {book.availability === "public-domain" ? "Public domain" : "Preview guide"}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-foreground">{book.title}</h3>
                <p className="mt-1 text-sm font-medium text-primary">by {book.author}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{book.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openReader(book)}>
                    <BookOpen className="mr-2 h-4 w-4" /> Read Online
                  </Button>
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

          <aside ref={readerRef} className="glass-card p-5 xl:sticky xl:top-20 xl:self-start">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">{activeBook.title}</h2>
                <p className="mt-1 text-sm text-primary">by {activeBook.author}</p>
              </div>
              <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{activeBook.genre}</span>
            </div>
            <div className="max-h-[620px] overflow-y-auto rounded-md border border-border bg-background p-4">
              <p className="mb-4 text-sm font-medium text-foreground">Online Reader</p>
              <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                {activeBook.reader.map((paragraph, index) => (
                  <p key={`${activeBook.title}-${index}`}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => saveBook(activeBook)}>
                  <BookmarkPlus className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadBookInfo(activeBook)}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
