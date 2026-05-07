import { BookOpen, Brain, FileText, ScrollText, Languages, MessageSquare, Pencil, Library, Clock, Star, BookMarked } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { LayoutDashboard } from "lucide-react";

const quickActions = [
  { icon: BookOpen, title: "Study Helper", to: "/study", color: "bg-primary" },
  { icon: Brain, title: "Quiz Generator", to: "/quiz", color: "bg-study-blue" },
  { icon: ScrollText, title: "Summaries", to: "/summary", color: "bg-study-purple" },
  { icon: FileText, title: "Past Papers", to: "/past-papers", color: "bg-study-pink" },
  { icon: Languages, title: "Grammar Coach", to: "/grammar", color: "bg-study-orange" },
  { icon: MessageSquare, title: "Counseling", to: "/counseling", color: "bg-study-green" },
  { icon: Pencil, title: "Resume", to: "/resume", color: "bg-primary" },
  { icon: BookMarked, title: "Books", to: "/books", color: "bg-study-blue" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="Your study command center. Jump into any tool." />

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.title}
            href={a.to}
            className="glass-card flex min-h-[118px] flex-col items-center justify-center gap-2 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`feature-icon ${a.color}`}>
              <a.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{a.title}</span>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Recent Activity</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground">Sessions today</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Saved Items</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground">Notes & quizzes</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Library className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Offline Library</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground">Saved for offline</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="glass-card p-10 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="font-display font-semibold text-foreground mb-2">Start Your Study Session</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload notes or start a quiz to begin</p>
        <Link href="/study" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">
          <BookOpen className="h-4 w-4" /> Upload Notes
        </Link>
      </div>
    </div>
  );
}
