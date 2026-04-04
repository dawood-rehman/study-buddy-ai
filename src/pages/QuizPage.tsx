import { useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function QuizPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [quizType, setQuizType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("medium");
  const [textInput, setTextInput] = useState("");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
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
        <TabsList className="mb-4">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FileUpload onFileSelect={(f) => console.log("Selected:", f.name)} />
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

      <Button className="gradient-primary border-0 w-full font-semibold">
        <Sparkles className="mr-2 h-4 w-4" /> Generate Quiz
      </Button>

      {/* Quiz Area (empty state) */}
      <div className="glass-card p-8 mt-6 text-center">
        <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Upload material and generate a quiz to see questions here</p>
      </div>
    </div>
  );
}
