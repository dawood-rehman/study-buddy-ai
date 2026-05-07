"use client";

import { useState } from "react";
import { BookOpen, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { GeneratedContent } from "@/components/GeneratedContent";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";
import { readTextFromFile } from "@/lib/file-text";

export default function StudyPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [textInput, setTextInput] = useState("");
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("simple");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      const text = await readTextFromFile(file);
      setTextInput(text);
      toast.success("Text extracted", {
        description: "Your file text is ready for Study Helper.",
      });
    } catch (error) {
      toast.info(getErrorMessage(error));
    }
  };

  const handleAsk = async () => {
    const prompt = question.trim() || "Explain this study material in a student-friendly way.";
    const context = textInput.trim();

    if (!context && !question.trim()) {
      toast.error("Add notes or ask a question first.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "study",
        language,
        prompt,
        context,
        options: { mode },
      });

      setResponse(result.content);
      toast.success("Explanation ready", {
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
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader icon={BookOpen} title="Study Helper" description="Upload notes and get AI-powered explanations" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      {/* Mode Selection */}
      <div className="mb-6 flex gap-2">
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Explanation mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple Explanation</SelectItem>
            <SelectItem value="step-by-step">Step by Step</SelectItem>
            <SelectItem value="exam">Exam Mode</SelectItem>
            <SelectItem value="teacher">Teacher Mode</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Input Methods */}
      <Tabs defaultValue="upload" className="mb-6">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FileUpload onFileSelect={handleFileSelect} />
        </TabsContent>
        <TabsContent value="text">
          <Textarea
            placeholder="Paste your notes or study material here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[200px]"
          />
        </TabsContent>
      </Tabs>

      {/* Ask Question */}
      <div className="glass-card p-4 mb-6">
        <label className="text-sm font-medium text-foreground block mb-2">Ask a question about the material</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            placeholder="e.g., Explain photosynthesis in simple terms..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[60px] flex-1"
          />
          <Button className="gradient-primary w-full border-0 sm:w-auto sm:self-end" onClick={handleAsk} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Response Area */}
      <div className="glass-card flex min-h-[200px] items-center justify-center p-4 sm:p-6">
        {response ? (
          <GeneratedContent content={response} title={question.trim() || "Study Explanation"} type="study" className="w-full" />
        ) : (
          <div className="text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Upload notes or ask a question to get started</p>
          </div>
        )}
      </div>

    </div>
  );
}
