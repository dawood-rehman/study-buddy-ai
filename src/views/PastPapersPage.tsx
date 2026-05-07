"use client";

import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { GeneratedContent } from "@/components/GeneratedContent";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";
import { readTextFromFile } from "@/lib/file-text";

export default function PastPapersPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [paperText, setPaperText] = useState("");
  const [solution, setSolution] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      const text = await readTextFromFile(file);
      setPaperText(text);
      toast.success("Paper text extracted", {
        description: "Ready to solve.",
      });
    } catch (error) {
      toast.info(getErrorMessage(error));
    }
  };

  const handleSolve = async () => {
    if (!paperText.trim()) {
      toast.error("Paste paper questions or upload a readable text file first.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "past-paper",
        language,
        prompt: "Solve this past paper with step-by-step reasoning and final answers.",
        context: paperText,
        modelPreference: "deep",
      });

      setSolution(result.content);
      toast.success("Past paper solved", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Paper solving failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={FileText} title="Past Paper Solver" description="Upload past papers and get step-by-step solutions" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Upload Past Paper</h3>
        <FileUpload onFileSelect={handleFileSelect} />
        <Textarea
          value={paperText}
          onChange={(event) => setPaperText(event.target.value)}
          placeholder="Paste paper questions here if your file is a PDF/image..."
          className="mt-4 min-h-[150px]"
        />
        <Button className="gradient-primary border-0 w-full mt-4 font-semibold" onClick={handleSolve} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {isLoading ? "Solving..." : "Solve Paper"}
        </Button>
      </div>

      <div className="glass-card p-6">
        {solution ? (
          <GeneratedContent content={solution} title="Past Paper Solution" type="past-paper" />
        ) : (
          <div className="text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Upload a past paper to get AI-generated step-by-step solutions for each question
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
