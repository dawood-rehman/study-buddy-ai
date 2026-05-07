"use client";

import { useState } from "react";
import { Bot, FileUp, Loader2, Sparkles } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { GeneratedContent } from "@/components/GeneratedContent";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAiStream } from "@/lib/ai-client";
import { readTextFromFile } from "@/lib/file-text";

export default function GeneralAiPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [prompt, setPrompt] = useState("");
  const [fileContext, setFileContext] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      const text = await readTextFromFile(file);
      setFileContext((current) => [current, `File: ${file.name}\n${text}`].filter(Boolean).join("\n\n"));
      toast.success("File text added", {
        description: file.name,
      });
    } catch (error) {
      toast.info(getErrorMessage(error));
    }
  };

  const handleAsk = async () => {
    if (!prompt.trim() && !fileContext.trim()) {
      toast.error("Ask a question or add file context first.");
      return;
    }

    setIsLoading(true);
    setResponse("");
    try {
      const result = await requestAiStream({
        task: "study",
        language,
        prompt: [
          "Answer as a general AI study assistant.",
          "Understand the full user request before responding.",
          "Use clear headings, structured formatting, and practical next steps.",
          prompt || "Analyze the uploaded content and create a structured response.",
        ].join("\n"),
        context: fileContext,
        options: { mode: "general-ai", output: "structured-downloadable-ready" },
      }, {
        onContent: setResponse,
      });

      setResponse(result.content);
      toast.success("AI response ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("AI request failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader icon={Bot} title="General AI" description="Ask general, subject-specific, or file-based questions with structured AI responses" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div className="glass-card p-4 sm:p-5">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask any general knowledge or subject-specific question..."
              className="min-h-[190px]"
            />
            <Button className="gradient-primary mt-4 w-full border-0" onClick={handleAsk} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isLoading ? "Thinking..." : "Ask AI"}
            </Button>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Upload Context</h2>
            </div>
            <FileUpload onFileSelect={handleFileSelect} maxSizeMB={12} />
            <Textarea
              value={fileContext}
              onChange={(event) => setFileContext(event.target.value)}
              placeholder="Paste extracted PDF, DOC/DOCX, XLSX, image OCR, or document text here..."
              className="mt-4 min-h-[120px]"
            />
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5">
          {response ? (
            <GeneratedContent content={response} title="General AI Response" type="general-ai" />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center text-center sm:min-h-[420px]">
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Responses will appear here with copy and save controls. File uploads require login; prompt-only AI remains available without login.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
