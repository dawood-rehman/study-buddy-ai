"use client";

import { useState } from "react";
import { CheckCircle2, ChevronRight, Languages, Loader2, Map, MessageCircle, Sparkles } from "lucide-react";
import { GeneratedContent } from "@/components/GeneratedContent";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";

const grammarFoundations = [
  { id: "parts-of-speech", title: "Parts of Speech", desc: "Nouns, pronouns, verbs, adjectives, adverbs, and connectors" },
  { id: "verbs", title: "Verbs", desc: "Action, helping, linking, modal verbs, and verb forms" },
  { id: "tenses", title: "Tenses", desc: "Present, past, future, perfect, continuous, and mixed tense use" },
  { id: "active-passive", title: "Active & Passive Voice", desc: "Voice transformation with exam-friendly rules" },
  { id: "direct-indirect", title: "Direct & Indirect Speech", desc: "Reported speech, tense backshift, and punctuation changes" },
  { id: "articles", title: "Articles", desc: "A, an, the, zero article, and common mistakes" },
  { id: "vocabulary", title: "Vocabulary Building", desc: "Word families, collocations, synonyms, and academic vocabulary" },
  { id: "sentence-structure", title: "Sentence Structure", desc: "Clauses, phrases, sentence types, and clear paragraph flow" },
  { id: "pronunciation", title: "Pronunciation Basics", desc: "Sounds, stress, rhythm, and confidence practice" },
  { id: "punctuation", title: "Punctuation", desc: "Commas, semicolons, apostrophes, quotation marks, and full stops" },
  { id: "idioms", title: "Idioms & Phrases", desc: "Natural phrases, meanings, and context-based usage" },
  { id: "writing", title: "Writing Skills", desc: "Essays, emails, summaries, coherence, and editing" },
  { id: "speaking", title: "Speaking Skills", desc: "Fluency, confidence, conversation structure, and self-correction" },
];

export default function GrammarPage() {
  const [selectedTopic, setSelectedTopic] = useState(grammarFoundations[0]);
  const [lesson, setLesson] = useState<string | null>(null);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorReply, setTutorReply] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState("beginner");
  const [roadmapGoals, setRoadmapGoals] = useState("");
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  const handleGenerateLesson = async () => {
    setIsLessonLoading(true);
    try {
      const result = await requestAi({
        task: "grammar",
        language: "english",
        prompt: [
          `Create a complete beginner-friendly English grammar lesson for: ${selectedTopic.title}.`,
          "Include concept explanation, rules, common mistakes, corrected examples, pronunciation notes when useful, practice exercises, and answer key.",
          "Use clear headings and interactive tasks.",
        ].join(" "),
        options: { topic: selectedTopic.title, scope: selectedTopic.desc },
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
      setIsLessonLoading(false);
    }
  };

  const handleTutor = async () => {
    if (!tutorInput.trim()) {
      toast.error("Write a sentence or question for the AI English Tutor.");
      return;
    }

    setIsTutorLoading(true);
    try {
      const result = await requestAi({
        task: "grammar",
        language: "english",
        prompt: [
          "Act as a real-time AI English tutor.",
          "Correct grammar mistakes, suggest better vocabulary, explain pronunciation/fluency tips, and continue conversational practice.",
          "Be supportive, concise, and practical.",
          `Student message: ${tutorInput}`,
        ].join("\n"),
        options: { mode: "ai-english-tutor", focus: ["grammar", "pronunciation", "vocabulary", "fluency", "confidence"] },
      });

      setTutorReply(result.content);
      toast.success("Tutor feedback ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("AI English Tutor failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setIsRoadmapLoading(true);
    try {
      const result = await requestAi({
        task: "grammar",
        language: "english",
        prompt: [
          "Create a personalized English grammar and communication roadmap.",
          `Current student state: ${currentState}.`,
          roadmapGoals ? `Student goals or weak areas: ${roadmapGoals}` : "Student did not provide extra goals, so create a balanced roadmap.",
          "Include weekly milestones, daily practice routine, grammar topics order, speaking practice, writing tasks, vocabulary growth, checkpoints, and measurable progress tests.",
          "Make it beginner-friendly, practical, and structured.",
        ].join("\n"),
        options: { mode: "grammar-roadmap", currentState, roadmapGoals },
      });

      setRoadmap(result.content);
      toast.success("Roadmap ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Roadmap generation failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsRoadmapLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader icon={Languages} title="Grammar Coach" description="Build English foundations and practice with an AI English tutor" />

      <Tabs defaultValue="foundation" className="mt-6">
        <TabsList className="mb-6 grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="foundation">English Grammar Foundation</TabsTrigger>
          <TabsTrigger value="tutor">AI English Tutor</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="foundation">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {grammarFoundations.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setLesson(null);
                  }}
                  className={`glass-card p-4 text-left transition-all hover:-translate-y-0.5 ${
                    selectedTopic.id === topic.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-foreground">{topic.title}</h3>
                    {selectedTopic.id === topic.id ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{topic.desc}</p>
                </button>
              ))}
            </div>

            <div className="glass-card p-4 sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">{selectedTopic.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedTopic.desc}</p>
                </div>
                <Button className="gradient-primary w-full border-0 sm:w-auto" onClick={handleGenerateLesson} disabled={isLessonLoading}>
                  {isLessonLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Lesson
                </Button>
              </div>
              {lesson ? (
                <GeneratedContent content={lesson} title={selectedTopic.title} type="grammar" />
              ) : (
                <div className="rounded-md border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
                  Select a foundation topic and generate a complete lesson with rules, examples, exercises, common mistakes, and answer key.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tutor">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="glass-card p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">Practice in English</h2>
              </div>
              <Textarea
                value={tutorInput}
                onChange={(event) => setTutorInput(event.target.value)}
                placeholder="Write in English: introduce yourself, answer an interview question, describe your day, or ask for speaking practice..."
                className="min-h-[220px]"
              />
              <Button className="gradient-primary mt-4 w-full border-0" onClick={handleTutor} disabled={isTutorLoading}>
                {isTutorLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get Tutor Feedback
              </Button>
            </div>
            <div className="glass-card p-4 sm:p-5">
              {tutorReply ? (
                <GeneratedContent content={tutorReply} title="AI English Tutor Feedback" type="grammar" />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center text-center sm:min-h-[280px]">
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    The tutor will correct grammar, improve vocabulary, suggest pronunciation practice, and continue the conversation so you can build fluency and confidence.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roadmap">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="glass-card p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">Personal English Roadmap</h2>
              </div>
              <label className="mb-2 block text-sm font-medium text-foreground">Current State</label>
              <Select value={currentState} onValueChange={setCurrentState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <label className="mb-2 mt-4 block text-sm font-medium text-foreground">Goals or Weak Areas</label>
              <Textarea
                value={roadmapGoals}
                onChange={(event) => setRoadmapGoals(event.target.value)}
                placeholder="Example: I understand basic grammar but I struggle with tenses, speaking confidence, and professional emails..."
                className="min-h-[180px]"
              />
              <Button className="gradient-primary mt-4 w-full border-0" onClick={handleGenerateRoadmap} disabled={isRoadmapLoading}>
                {isRoadmapLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Roadmap
              </Button>
            </div>

            <div className="glass-card p-4 sm:p-5">
              {roadmap ? (
                <GeneratedContent content={roadmap} title="English Learning Roadmap" type="grammar" />
              ) : (
                <div className="flex min-h-[260px] items-center justify-center text-center sm:min-h-[320px]">
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    Choose your level and goals to get a practical roadmap with weekly targets, daily practice, grammar sequence, speaking drills, and progress checks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
