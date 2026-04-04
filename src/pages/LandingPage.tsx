import { Link } from "react-router-dom";
import { BookOpen, Brain, FileText, GraduationCap, Languages, MessageSquare, Pencil, ScrollText, Sparkles, ArrowRight, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: BookOpen, title: "Study Helper", desc: "Upload notes & get AI explanations", to: "/study", color: "bg-primary" },
  { icon: Brain, title: "Quiz Generator", desc: "Auto-generate MCQs & practice tests", to: "/quiz", color: "bg-study-blue" },
  { icon: ScrollText, title: "Summaries", desc: "Get concise summaries & revision notes", to: "/summary", color: "bg-study-purple" },
  { icon: FileText, title: "Past Papers", desc: "Upload papers & get step-by-step solutions", to: "/past-papers", color: "bg-study-pink" },
  { icon: Languages, title: "Grammar Coach", desc: "Learn grammar with interactive lessons", to: "/grammar", color: "bg-study-orange" },
  { icon: MessageSquare, title: "Counseling", desc: "Get personalized study guidance", to: "/counseling", color: "bg-study-green" },
  { icon: Pencil, title: "Resume Builder", desc: "Create professional resumes easily", to: "/resume", color: "bg-primary" },
  { icon: BookMarked, title: "Recommended Books", desc: "Curated books by top authors", to: "/books", color: "bg-study-blue" },
];

export default function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          AI-Powered Study Companion
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 leading-tight">
          Study Smarter,<br />
          <span className="text-gradient">Not Harder</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Upload your notes, generate quizzes, solve past papers, and get AI explanations in English, Urdu, or Roman Urdu. Your all-in-one study companion.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild size="lg" className="gradient-primary border-0 font-semibold">
            <Link to="/dashboard">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/study">Try Study Helper</Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-16">
        <h2 className="text-2xl font-display font-bold text-foreground text-center mb-8">Everything You Need to Excel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="glass-card p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`feature-icon ${f.color} mb-3`}>
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Language Support */}
      <section className="glass-card p-8 text-center mb-16">
        <Languages className="h-8 w-8 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Multilingual Support</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Switch between English, Urdu (اردو), and Roman Urdu explanations with a single click. Learn in the language you're most comfortable with.
        </p>
      </section>
    </div>
  );
}
