"use client";

import { useState } from "react";
import { BriefcaseBusiness, GraduationCap, Loader2, MessageSquare, Sparkles, Target } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { GeneratedContent } from "@/components/GeneratedContent";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";

type CounselingMode = "planner" | "career" | "companies";

const modeMeta: Record<CounselingMode, { title: string; icon: typeof Target; prompt: string }> = {
  planner: {
    title: "Weak Subject Study Planner",
    icon: Target,
    prompt: "Create a personalized weak-subject improvement plan with daily and weekly schedule, practice recommendations, revision cycles, checkpoints, and improvement strategies.",
  },
  career: {
    title: "Career & Degree Guidance",
    icon: GraduationCap,
    prompt: "Suggest suitable future degrees, career paths, important skills, and a practical growth roadmap based on the student's situation, interests, and goals.",
  },
  companies: {
    title: "Field & Company Recommendations",
    icon: BriefcaseBusiness,
    prompt: "Recommend best career fields, suitable industries, relevant job roles, and example companies based on education level and degree information.",
  },
};

export default function CounselingPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [mode, setMode] = useState<CounselingMode>("planner");
  const [fields, setFields] = useState({
    studyLevel: "",
    classYear: "",
    weakSubjects: "",
    currentSituation: "",
    interests: "",
    goals: "",
    degreeInfo: "",
    educationLevel: "",
  });
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
  };

  const handleGetPlan = async () => {
    const requiredText = mode === "planner"
      ? fields.weakSubjects
      : mode === "career"
        ? `${fields.currentSituation} ${fields.interests} ${fields.goals}`
        : `${fields.educationLevel} ${fields.degreeInfo}`;

    if (!requiredText.trim()) {
      toast.error("Add the required details first.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestAi({
        task: "counseling",
        language,
        prompt: modeMeta[mode].prompt,
        context: Object.entries(fields)
          .map(([key, value]) => `${key}: ${value || "Not provided"}`)
          .join("\n"),
        options: { counselingMode: mode },
      });

      setPlan(result.content);
      toast.success(`${modeMeta[mode].title} ready`, {
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
    <AuthGate
      title="Login required for counseling"
      description="Counseling stores personal study and career context, so login is required before using these tools."
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <PageHeader icon={MessageSquare} title="Study Counseling" description="Personalized study planning, degree guidance, and career recommendations" />
          <LanguageToggle value={language} onChange={setLanguage} />
        </div>

        <Tabs value={mode} onValueChange={(value) => { setMode(value as CounselingMode); setPlan(null); }}>
          <TabsList className="mb-6 grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="planner">Weak Subjects</TabsTrigger>
            <TabsTrigger value="career">Degree Guidance</TabsTrigger>
            <TabsTrigger value="companies">Fields & Companies</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="glass-card p-5">
              <TabsContent value="planner" className="mt-0 space-y-4">
                <SectionHeader mode="planner" />
                <Input value={fields.studyLevel} onChange={(event) => updateField("studyLevel", event.target.value)} placeholder="Study level, e.g. Matric, A-Levels, BSCS" />
                <Input value={fields.classYear} onChange={(event) => updateField("classYear", event.target.value)} placeholder="Class / year" />
                <Textarea value={fields.weakSubjects} onChange={(event) => updateField("weakSubjects", event.target.value)} placeholder="Weak subjects/topics and why they feel difficult..." className="min-h-[150px]" />
              </TabsContent>

              <TabsContent value="career" className="mt-0 space-y-4">
                <SectionHeader mode="career" />
                <Textarea value={fields.currentSituation} onChange={(event) => updateField("currentSituation", event.target.value)} placeholder="Current study situation..." className="min-h-[100px]" />
                <Textarea value={fields.interests} onChange={(event) => updateField("interests", event.target.value)} placeholder="Interests, strengths, subjects you enjoy..." className="min-h-[100px]" />
                <Textarea value={fields.goals} onChange={(event) => updateField("goals", event.target.value)} placeholder="Future goals, lifestyle preferences, income goals..." className="min-h-[100px]" />
              </TabsContent>

              <TabsContent value="companies" className="mt-0 space-y-4">
                <SectionHeader mode="companies" />
                <Input value={fields.educationLevel} onChange={(event) => updateField("educationLevel", event.target.value)} placeholder="Current education level" />
                <Textarea value={fields.degreeInfo} onChange={(event) => updateField("degreeInfo", event.target.value)} placeholder="Degree information, major, skills, projects, location preference..." className="min-h-[180px]" />
              </TabsContent>

              <Button className="gradient-primary mt-5 w-full border-0 font-semibold" onClick={handleGetPlan} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isLoading ? "Generating..." : `Generate ${modeMeta[mode].title}`}
              </Button>
            </div>

            <div className="glass-card p-5">
              {plan ? (
                <GeneratedContent content={plan} title={modeMeta[mode].title} type="counseling" />
              ) : (
                <div className="flex min-h-[360px] items-center justify-center text-center">
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    Fill the selected counseling form to receive a structured plan with priorities, schedules, recommendations, and next steps.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </div>
    </AuthGate>
  );
}

function SectionHeader({ mode }: { mode: CounselingMode }) {
  const Icon = modeMeta[mode].icon;

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="font-display font-semibold text-foreground">{modeMeta[mode].title}</h3>
    </div>
  );
}
