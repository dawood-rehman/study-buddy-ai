import { useState } from "react";
import { BookOpen, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudyPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [textInput, setTextInput] = useState("");
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("simple");
  const [response, setResponse] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={BookOpen} title="Study Helper" description="Upload notes and get AI-powered explanations" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-6">
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-[200px]">
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
        <TabsList className="mb-4">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FileUpload onFileSelect={(f) => console.log("Selected:", f.name)} />
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
        <div className="flex gap-2">
          <Textarea
            placeholder="e.g., Explain photosynthesis in simple terms..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[60px] flex-1"
          />
          <Button className="gradient-primary border-0 self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Response Area */}
      <div className="glass-card p-6 min-h-[200px] flex items-center justify-center">
        {response ? (
          <div className="prose prose-sm max-w-none">{response}</div>
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
