import { useState } from "react";
import { ScrollText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { LanguageToggle, Language } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SummaryPage() {
  const [language, setLanguage] = useState<Language>("english");
  const [summaryType, setSummaryType] = useState("short");
  const [textInput, setTextInput] = useState("");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <PageHeader icon={ScrollText} title="Summary Generator" description="Get concise summaries and revision notes" />
        <LanguageToggle value={language} onChange={setLanguage} />
      </div>

      {/* Summary Type Tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: "short", label: "Short Summary" },
          { id: "detailed", label: "Detailed Summary" },
          { id: "revision", label: "Exam Revision Points" },
          { id: "formulas", label: "Key Facts / Formulas" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSummaryType(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              summaryType === t.id
                ? "gradient-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
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
            placeholder="Paste content to summarize..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[150px]"
          />
        </TabsContent>
      </Tabs>

      <Button className="gradient-primary border-0 w-full font-semibold">
        <Sparkles className="mr-2 h-4 w-4" /> Generate Summary
      </Button>

      <div className="glass-card p-8 mt-6 text-center">
        <ScrollText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Upload content and click generate to see your summary</p>
      </div>
    </div>
  );
}
