import { useState } from "react";
import { Pencil, Plus, Trash2, Download, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  education: string[];
  skills: string[];
  experience: string[];
  projects: string[];
}

const emptyResume: ResumeData = {
  name: "", email: "", phone: "", summary: "",
  education: [""], skills: [""], experience: [""], projects: [""],
};

export default function ResumePage() {
  const [data, setData] = useState<ResumeData>(emptyResume);

  const updateList = (key: keyof ResumeData, index: number, value: string) => {
    const list = [...(data[key] as string[])];
    list[index] = value;
    setData({ ...data, [key]: list });
  };

  const addItem = (key: keyof ResumeData) => {
    setData({ ...data, [key]: [...(data[key] as string[]), ""] });
  };

  const removeItem = (key: keyof ResumeData, index: number) => {
    const list = (data[key] as string[]).filter((_, i) => i !== index);
    setData({ ...data, [key]: list.length ? list : [""] });
  };

  const ListSection = ({ title, field }: { title: string; field: keyof ResumeData }) => (
    <div className="mb-6">
      <label className="text-sm font-medium text-foreground block mb-2">{title}</label>
      {(data[field] as string[]).map((item, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <Input
            value={item}
            onChange={(e) => updateList(field, i, e.target.value)}
            placeholder={`Add ${title.toLowerCase()}...`}
          />
          <Button variant="ghost" size="icon" onClick={() => removeItem(field, i)} className="shrink-0">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => addItem(field)} className="gap-1">
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader icon={Pencil} title="Resume Builder" description="Create a professional resume with AI assistance" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Your Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Full Name</label>
              <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <Input value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="john@email.com" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1.5">Phone</label>
            <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+92 300 1234567" />
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1.5">Summary</label>
            <Textarea value={data.summary} onChange={(e) => setData({ ...data, summary: e.target.value })} placeholder="Brief professional summary..." className="min-h-[80px]" />
          </div>
          <ListSection title="Education" field="education" />
          <ListSection title="Skills" field="skills" />
          <ListSection title="Experience" field="experience" />
          <ListSection title="Projects" field="projects" />

          <div className="flex gap-2">
            <Button className="gradient-primary border-0 flex-1 font-semibold">
              <Sparkles className="mr-2 h-4 w-4" /> AI Generate
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Preview</h3>
          <div className="border border-border rounded-lg p-6 bg-background min-h-[500px]">
            {data.name ? (
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">{data.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {[data.email, data.phone].filter(Boolean).join(" • ")}
                </p>
                {data.summary && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Summary</h4>
                    <p className="text-sm text-foreground">{data.summary}</p>
                  </div>
                )}
                {data.education.some(Boolean) && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Education</h4>
                    {data.education.filter(Boolean).map((e, i) => <p key={i} className="text-sm text-foreground">{e}</p>)}
                  </div>
                )}
                {data.skills.some(Boolean) && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {data.skills.filter(Boolean).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data.experience.some(Boolean) && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Experience</h4>
                    {data.experience.filter(Boolean).map((e, i) => <p key={i} className="text-sm text-foreground">{e}</p>)}
                  </div>
                )}
                {data.projects.some(Boolean) && (
                  <div>
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Projects</h4>
                    {data.projects.filter(Boolean).map((p, i) => <p key={i} className="text-sm text-foreground">{p}</p>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Fill in your details to see a live preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
