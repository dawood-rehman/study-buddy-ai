import { useState } from "react";
import { Languages, ChevronRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";

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

  return (
    <div className="max-w-4xl mx-auto">
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
            onClick={() => setSelectedTopic(topic.id)}
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
          <h3 className="font-display font-semibold text-foreground mb-4">
            {topics.find(t => t.id === selectedTopic)?.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            Lesson content will appear here with examples, quizzes, and explanations. Connect AI to enable interactive grammar lessons.
          </p>
        </div>
      )}
    </div>
  );
}
