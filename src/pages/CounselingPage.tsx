import { useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageToggle, Language } from "@/components/LanguageToggle";

export default function CounselingPage() {
  const [language, setLanguage] = useState<Language>("english");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={MessageSquare} title="Study Counseling" description="Get personalized study plans and guidance" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Tell us about yourself</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Study Level</label>
            <Select>
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
            <Input placeholder="e.g., 10th grade, 2nd year" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Subject</label>
            <Input placeholder="e.g., Physics, Computer Science" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Exam Goal</label>
            <Input placeholder="e.g., Score 90%+, Pass MDCAT" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Weak Topics</label>
          <Textarea placeholder="Describe topics you struggle with..." className="min-h-[80px]" />
        </div>
        <Button className="gradient-primary border-0 w-full mt-4 font-semibold">
          <Sparkles className="mr-2 h-4 w-4" /> Get Study Plan
        </Button>
      </div>

      <div className="glass-card p-8 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Fill in your details above to get a personalized study plan, daily timetable, and revision strategy
        </p>
      </div>
    </div>
  );
}
