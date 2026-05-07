"use client";

import { useState } from "react";
import { Languages, ChevronRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";

const topics = [
  { id: "nouns", title: "Nouns", desc: "People, places, things", progress: 0 },
  { id: "pronouns", title: "Pronouns", desc: "He, she, it, they", progress: 0 },
  { id: "verbs", title: "Verbs", desc: "Action and state words", progress: 0 },
  { id: "tenses", title: "Tenses", desc: "Past, present, future", progress: 0 },
  { id: "articles", title: "Articles", desc: "A, an, the", progress: 0 },
  { id: "prepositions", title: "Prepositions", desc: "In, on, at, by", progress: 0 },
  { id: "active-passive", title: "Active / Passive Voice", desc: "Voice transformations", progress: 0 },
  { id: "direct-indirect", title: "Direct / Indirect Speech", desc: "Reported speech", progress: 0 },
  { id: "punctuation", title: "Punctuation", desc: "Commas, periods, quotes", progress: 0 },
];

export default function GrammarPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentTopic = topics.find((topic) => topic.id === selectedTopic);

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
    setLesson(null);
    toast.info("Grammar topic selected");
  };

  const handleGenerateLesson = async () => {
    if (!currentTopic) return;

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "grammar",
        language: "english",
        prompt: `Teach ${currentTopic.title} with examples and a short practice exercise.`,
        options: { topic: currentTopic.title, level: "student" },
      });

      setLesson(result.content);
      toast.success("Grammar lesson ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Lesson generation failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader icon={Languages} title="Grammar Coach" description="Learn grammar step by step with interactive lessons" />

      {/* Overall Progress */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Overall Progress</span>
          <span className="text-sm text-muted-foreground">0 / {topics.length} completed</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleSelectTopic(topic.id)}
            className="glass-card p-4 text-left hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                {topic.title}
              </h3>
              {topic.progress === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{topic.desc}</p>
            <Progress value={topic.progress} className="h-1.5" />
          </button>
        ))}
      </div>

      {selectedTopic && (
        <div className="glass-card p-6 mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display font-semibold text-foreground">
              {currentTopic?.title}
            </h3>
            <Button className="gradient-primary border-0 font-semibold" onClick={handleGenerateLesson} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isLoading ? "Generating..." : "Generate Lesson"}
            </Button>
          </div>
          {lesson ? (
            <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{lesson}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate an AI lesson with examples, corrections, and a short practice exercise.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
