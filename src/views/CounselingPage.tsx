"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";

export default function CounselingPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [studyLevel, setStudyLevel] = useState("");
  const [classYear, setClassYear] = useState("");
  const [subject, setSubject] = useState("");
  const [examGoal, setExamGoal] = useState("");
  const [weakTopics, setWeakTopics] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetPlan = async () => {
    if (!studyLevel || !subject.trim() || !examGoal.trim()) {
      toast.error("Study level, subject, and exam goal are required.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "counseling",
        language,
        prompt: "Create a personalized study plan from these details.",
        context: [
          `Study level: ${studyLevel}`,
          `Class/year: ${classYear || "Not provided"}`,
          `Subject: ${subject}`,
          `Exam goal: ${examGoal}`,
          `Weak topics: ${weakTopics || "Not provided"}`,
        ].join("\n"),
      });

      setPlan(result.content);
      toast.success("Study plan ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("Counseling request failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={MessageSquare} title="Study Counseling" description="Get personalized study plans and guidance" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Tell us about yourself</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Study Level</label>
            <Select value={studyLevel} onValueChange={setStudyLevel}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school">School (Grade 1-10)</SelectItem>
                <SelectItem value="matric">Matric / O-Levels</SelectItem>
                <SelectItem value="inter">Intermediate / A-Levels</SelectItem>
                <SelectItem value="bachelors">Bachelors</SelectItem>
                <SelectItem value="masters">Masters</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Class / Year</label>
            <Input value={classYear} onChange={(event) => setClassYear(event.target.value)} placeholder="e.g., 10th grade, 2nd year" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Subject</label>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g., Physics, Computer Science" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Exam Goal</label>
            <Input value={examGoal} onChange={(event) => setExamGoal(event.target.value)} placeholder="e.g., Score 90%+, Pass MDCAT" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Weak Topics</label>
          <Textarea value={weakTopics} onChange={(event) => setWeakTopics(event.target.value)} placeholder="Describe topics you struggle with..." className="min-h-[80px]" />
        </div>
        <Button className="gradient-primary border-0 w-full mt-4 font-semibold" onClick={handleGetPlan} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {isLoading ? "Planning..." : "Get Study Plan"}
        </Button>
      </div>

      <div className="glass-card p-6">
        {plan ? (
          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{plan}</div>
        ) : (
          <div className="text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Fill in your details above to get a personalized study plan, daily timetable, and revision strategy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
