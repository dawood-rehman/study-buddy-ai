"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, Sparkles } from "lucide-react";
import { GeneratedContent } from "@/components/GeneratedContent";
import { Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";

type PracticeLevel = "simple" | "tough" | "advanced";

interface PracticeTestPanelProps {
  language: Language;
  sourceTitle: string;
  defaultContent?: string;
  className?: string;
}

const levelLabels: Record<PracticeLevel, string> = {
  simple: "Simple Test",
  tough: "Tough Test",
  advanced: "Advanced Level Test",
};

export function PracticeTestPanel({ language, sourceTitle, defaultContent = "", className = "" }: PracticeTestPanelProps) {
  const [material, setMaterial] = useState(defaultContent);
  const [level, setLevel] = useState<PracticeLevel>("simple");
  const [test, setTest] = useState<string | null>(null);
  const [answers, setAnswers] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!material.trim() && defaultContent.trim()) {
      setMaterial(defaultContent);
    }
  }, [defaultContent, material]);

  const useCurrentContent = () => {
    if (!defaultContent.trim()) {
      toast.info("Current page content is empty. Paste material first.");
      return;
    }

    setMaterial(defaultContent);
    toast.success("Current material loaded for practice.");
  };

  const handleGenerateTest = async () => {
    if (!material.trim()) {
      toast.error("Add material first so AI can create a test from the same content.");
      return;
    }

    setIsGenerating(true);
    setGrade(null);
    try {
      const result = await requestAi({
        task: "quiz",
        language,
        prompt: [
          `Create a ${levelLabels[level]} from the provided ${sourceTitle} material.`,
          "Keep the test strictly based on the supplied material.",
          "Include clear instructions, marks per question, and a student answer format.",
          "Do not include the answer key yet because the student will solve it first.",
        ].join("\n"),
        context: material,
        options: { mode: "practice-test", level, sourceTitle },
      });

      setTest(result.content);
      toast.success("Practice test ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Practice test failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckAnswers = async () => {
    if (!test?.trim()) {
      toast.error("Generate a practice test first.");
      return;
    }

    if (!answers.trim()) {
      toast.error("Write your answers before checking.");
      return;
    }

    setIsChecking(true);
    try {
      const result = await requestAi({
        task: "quiz",
        language,
        prompt: [
          "Act as a strict but helpful examiner.",
          "Mark the student's answers against the generated test and the original material.",
          "Return: total score out of 100, grade, per-question correct/incorrect status, corrections, and a short improvement plan.",
          "If an answer is partially correct, give partial marks and explain exactly what was missing.",
        ].join("\n"),
        context: [
          `Original material:\n${material}`,
          `Generated test:\n${test}`,
          `Student answers:\n${answers}`,
        ].join("\n\n---\n\n"),
        options: { mode: "practice-test-marking", level, sourceTitle },
      });

      setGrade(result.content);
      toast.success("Answers checked", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Answer checking failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <section className={`glass-card p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Practice Test</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Create a test from the same material, solve it, then get marks and corrections.</p>
          </div>
        </div>
        <Select value={level} onValueChange={(value) => setLevel(value as PracticeLevel)}>
          <SelectTrigger className="w-full sm:w-[210px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple Test</SelectItem>
            <SelectItem value="tough">Tough Test</SelectItem>
            <SelectItem value="advanced">Advanced Level Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-medium text-foreground">Practice Material</label>
            <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={useCurrentContent}>
              Use Current Content
            </Button>
          </div>
          <Textarea
            value={material}
            onChange={(event) => setMaterial(event.target.value)}
            placeholder="Paste the exact content you want AI to test you on..."
            className="min-h-[190px]"
          />
          <Button className="gradient-primary mt-3 w-full border-0" onClick={handleGenerateTest} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Practice Test
          </Button>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Your Answers</label>
          <Textarea
            value={answers}
            onChange={(event) => setAnswers(event.target.value)}
            placeholder="Solve the test here. Number your answers clearly..."
            className="min-h-[190px]"
          />
          <Button className="mt-3 w-full" variant="outline" onClick={handleCheckAnswers} disabled={isChecking}>
            {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
            Check Answers & Grade
          </Button>
        </div>
      </div>

      {test ? (
        <GeneratedContent content={test} title={`${levelLabels[level]} - ${sourceTitle}`} type="quiz" className="mt-5" />
      ) : null}

      {grade ? (
        <GeneratedContent content={grade} title="Marks, Grade & Corrections" type="quiz" className="mt-5" />
      ) : null}
    </section>
  );
}
