"use client";

import { useState } from "react";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { GeneratedContent } from "@/components/GeneratedContent";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { PracticeTestPanel } from "@/components/PracticeTestPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";
import { readTextFromFile } from "@/lib/file-text";

export default function QuizPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [quizType, setQuizType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("medium");
  const [textInput, setTextInput] = useState("");
  const [quiz, setQuiz] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      const text = await readTextFromFile(file);
      setTextInput(text);
      toast.success("Text extracted", {
        description: "Ready to generate a quiz.",
      });
    } catch (error) {
      toast.info(getErrorMessage(error));
    }
  };

  const handleGenerateQuiz = async () => {
    if (!textInput.trim()) {
      toast.error("Paste study content or upload a readable text file first.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "quiz",
        language,
        prompt: "Generate a quiz from this study material.",
        context: textInput,
        options: { quizType, difficulty },
      });

      setQuiz(result.content);
      toast.success("Quiz generated", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Quiz generation failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader icon={Brain} title="Quiz Generator" description="Generate practice questions from your study material" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Quiz Type</label>
          <Select value={quizType} onValueChange={setQuizType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">Multiple Choice (MCQs)</SelectItem>
              <SelectItem value="short">Short Questions</SelectItem>
              <SelectItem value="long">Long Questions</SelectItem>
              <SelectItem value="truefalse">True / False</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Difficulty</label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            placeholder="Paste study content to generate a quiz..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[150px]"
          />
        </TabsContent>
      </Tabs>

      <Button className="gradient-primary border-0 w-full font-semibold" onClick={handleGenerateQuiz} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {isLoading ? "Generating..." : "Generate Quiz"}
      </Button>

      {/* Quiz Area (empty state) */}
      <div className="glass-card mt-6 p-4 sm:p-6">
        {quiz ? (
          <GeneratedContent content={quiz} title="Generated Quiz" type="quiz" />
        ) : (
          <div className="text-center">
            <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Upload material and generate a quiz to see questions here</p>
          </div>
        )}
      </div>

      <PracticeTestPanel
        language={language}
        sourceTitle="Quiz Generator"
        defaultContent={[textInput, quiz || ""].filter(Boolean).join("\n\n")}
        className="mt-6"
      />
    </div>
  );
}
