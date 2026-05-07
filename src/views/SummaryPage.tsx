"use client";

import { useState } from "react";
import { Loader2, ScrollText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";
import { readTextFromFile } from "@/lib/file-text";

export default function SummaryPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [summaryType, setSummaryType] = useState("short");
  const [textInput, setTextInput] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      const text = await readTextFromFile(file);
      setTextInput(text);
      toast.success("Text extracted", {
        description: "Ready to summarize.",
      });
    } catch (error) {
      toast.info(getErrorMessage(error));
    }
  };

  const handleGenerateSummary = async () => {
    if (!textInput.trim()) {
      toast.error("Paste content or upload a readable text file first.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "summary",
        language,
        prompt: "Summarize this material for exam preparation.",
        context: textInput,
        options: { summaryType },
      });

      setSummary(result.content);
      toast.success("Summary generated", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Summary failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={ScrollText} title="Summary Generator" description="Get concise summaries and revision notes" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      {/* Summary Type Tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: "short", label: "Short Summary" },
          { id: "detailed", label: "Detailed Summary" },
          { id: "revision", label: "Exam Revision Points" },
          { id: "formulas", label: "Key Facts / Formulas" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSummaryType(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              summaryType === t.id
                ? "gradient-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="upload" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FileUpload onFileSelect={handleFileSelect} />
        </TabsContent>
        <TabsContent value="text">
          <Textarea
            placeholder="Paste content to summarize..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[150px]"
          />
        </TabsContent>
      </Tabs>

      <Button className="gradient-primary border-0 w-full font-semibold" onClick={handleGenerateSummary} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {isLoading ? "Generating..." : "Generate Summary"}
      </Button>

      <div className="glass-card p-6 mt-6">
        {summary ? (
          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{summary}</div>
        ) : (
          <div className="text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Upload content and click generate to see your summary</p>
          </div>
        )}
      </div>
    </div>
  );
}
