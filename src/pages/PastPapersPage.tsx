import { useState } from "react";
import { FileText, Sparkles, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";

export default function PastPapersPage() {
  const [language, setLanguage] = useState<Language>("english");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={FileText} title="Past Paper Solver" description="Upload past papers and get step-by-step solutions" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Upload Past Paper</h3>
        <FileUpload onFileSelect={(f) => console.log("Selected:", f.name)} />
        <Button className="gradient-primary border-0 w-full mt-4 font-semibold">
          <Sparkles className="mr-2 h-4 w-4" /> Solve Paper
        </Button>
      </div>

      <div className="glass-card p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Upload a past paper to get AI-generated step-by-step solutions for each question
        </p>
      </div>
    </div>
  );
}
