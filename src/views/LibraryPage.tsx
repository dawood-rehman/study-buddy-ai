import { Library, Search, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader icon={Library} title="Saved Library" description="Your saved notes, quizzes, and study materials" />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search saved notes, quizzes, summaries..." className="pl-10" />
      </div>

      <div className="glass-card p-10 text-center">
        <Library className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-display font-semibold text-foreground mb-2">Your Library is Empty</h3>
        <p className="text-sm text-muted-foreground mb-1">
          Save notes, quizzes, and summaries to access them offline anytime.
        </p>
        <p className="text-xs text-muted-foreground">Items you save will appear here for quick access.</p>
      </div>
    </div>
  );
}
