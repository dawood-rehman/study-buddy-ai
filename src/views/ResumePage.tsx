"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, Loader2, Pencil, Plus, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { FileUpload } from "@/components/FileUpload";
import { GeneratedContent } from "@/components/GeneratedContent";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage, requestAi } from "@/lib/ai-client";
import { readTextFromFile } from "@/lib/file-text";

interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  summary: string;
  education: string[];
  skills: string[];
  experience: string[];
  projects: string[];
}

const emptyResume: ResumeData = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  summary: "",
  education: [""],
  skills: [""],
  experience: [""],
  projects: [""],
};

const atsTemplates: Array<{ name: string; description: string; data: ResumeData }> = [
  {
    name: "Modern Graduate",
    description: "Clean template for students, interns, and entry-level roles.",
    data: {
      name: "Ayesha Khan",
      title: "Computer Science Student | Frontend Developer",
      email: "ayesha.khan@email.com",
      phone: "+92 300 1234567",
      location: "Lahore, Pakistan",
      linkedin: "linkedin.com/in/ayeshakhan",
      portfolio: "github.com/ayeshakhan",
      summary: "Computer Science student with hands-on experience building responsive React applications, REST API integrations, and accessible user interfaces.",
      education: ["BS Computer Science, University of Lahore - Expected 2027", "Intermediate in Computer Science, Punjab College - 2023"],
      skills: ["JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS", "REST APIs", "Git", "SQL"],
      experience: ["Frontend Intern, BrightTech Solutions - Built reusable React components and improved mobile responsiveness across 12 screens."],
      projects: ["Study Buddy AI - Developed a student dashboard with quiz generation, summaries, and resume builder flows."],
    },
  },
  {
    name: "International Professional",
    description: "ATS-first layout for corporate and multinational applications.",
    data: {
      ...emptyResume,
      name: "Daniel Morgan",
      title: "Operations Analyst",
      email: "daniel.morgan@email.com",
      location: "Dubai, UAE",
      summary: "Operations analyst with experience improving reporting workflows, coordinating cross-functional teams, and tracking performance metrics.",
      skills: ["Excel", "Power BI", "SQL", "Process Improvement", "Stakeholder Communication", "Reporting"],
      experience: ["Operations Analyst, GlobalTrade - Automated weekly reporting templates and reduced manual reconciliation time by 30%."],
      projects: ["KPI Dashboard - Built executive reporting views for sales, inventory, and service-level metrics."],
    },
  },
  {
    name: "Tech Specialist",
    description: "Best for software, data, and technical project resumes.",
    data: {
      ...emptyResume,
      name: "Hamza Ali",
      title: "Junior Software Engineer",
      email: "hamza.ali@email.com",
      location: "Karachi, Pakistan",
      summary: "Junior software engineer focused on building maintainable web applications with React, Node.js, REST APIs, and relational databases.",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "GitHub Actions", "Testing", "API Design"],
      experience: ["Software Trainee, CodeWorks - Implemented form validation, API integrations, and reusable UI components for client dashboards."],
      projects: ["Issue Tracker - Created role-based task management workflows with authentication and audit history."],
    },
  },
  {
    name: "Business & Marketing",
    description: "Strong for sales, marketing, HR, and business roles.",
    data: {
      ...emptyResume,
      name: "Sara Malik",
      title: "Digital Marketing Associate",
      email: "sara.malik@email.com",
      location: "Islamabad, Pakistan",
      summary: "Digital marketing associate skilled in campaign planning, content calendars, SEO basics, social analytics, and performance reporting.",
      skills: ["SEO", "Content Strategy", "Meta Ads", "Google Analytics", "Canva", "Copywriting", "Campaign Reporting"],
      experience: ["Marketing Intern, GrowthHub - Managed social content calendar and improved monthly engagement through audience-focused posts."],
      projects: ["SEO Audit - Researched keywords, optimized landing-page copy, and prepared improvement roadmap."],
    },
  },
  {
    name: "Academic Research",
    description: "For scholarships, research assistants, and academic applications.",
    data: {
      ...emptyResume,
      name: "Noor Fatima",
      title: "Research Assistant | Psychology Graduate",
      email: "noor.fatima@email.com",
      location: "Multan, Pakistan",
      summary: "Psychology graduate with research experience in survey design, literature reviews, data cleaning, and academic writing.",
      skills: ["Literature Review", "SPSS", "Survey Design", "Data Cleaning", "Academic Writing", "Presentation"],
      experience: ["Research Assistant, University Lab - Supported data collection for 200+ responses and prepared coded datasets for analysis."],
      projects: ["Final Year Research - Studied study habits and exam anxiety among undergraduate students."],
    },
  },
];

const listFields: Array<{ field: keyof Pick<ResumeData, "education" | "skills" | "experience" | "projects">; title: string; multiline?: boolean }> = [
  { field: "education", title: "Education" },
  { field: "skills", title: "Skills" },
  { field: "experience", title: "Experience", multiline: true },
  { field: "projects", title: "Projects", multiline: true },
];

function filled(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function fileSafeName(name: string) {
  return (name || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ResumePage() {
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [atsAnalysis, setAtsAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const contactLine = useMemo(
    () => [data.email, data.phone, data.location, data.linkedin, data.portfolio].filter(Boolean).join(" | "),
    [data.email, data.location, data.linkedin, data.phone, data.portfolio],
  );

  const updateField = (field: keyof ResumeData, value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const updateList = (field: keyof ResumeData, index: number, value: string) => {
    const list = [...(data[field] as string[])];
    list[index] = value;
    setData({ ...data, [field]: list });
  };

  const addItem = (field: keyof ResumeData) => {
    setData({ ...data, [field]: [...(data[field] as string[]), ""] });
  };

  const removeItem = (field: keyof ResumeData, index: number) => {
    const list = (data[field] as string[]).filter((_, i) => i !== index);
    setData({ ...data, [field]: list.length ? list : [""] });
  };

  const loadTemplate = (template = atsTemplates[0]) => {
    setData(template.data);
    setAiSuggestion(null);
    setAtsAnalysis(null);
    toast.success(`${template.name} loaded`, {
      description: "Edit the details, run AI improvement, then download a text-based ATS PDF.",
    });
  };

  const handleResumeUpload = async (file: File) => {
    try {
      const text = await readTextFromFile(file);
      setData((current) => ({
        ...current,
        summary: [current.summary, "Uploaded resume text:", text].filter(Boolean).join("\n\n"),
      }));
      toast.success("Resume text added", {
        description: "Review the imported text and ask AI to improve it.",
      });
    } catch (error) {
      toast.info(getErrorMessage(error));
    }
  };

  const handleAtsAnalysis = async () => {
    const resumeText = JSON.stringify(data, null, 2);
    if (!data.name.trim() && !data.summary.trim() && filled(data.experience).length === 0) {
      toast.error("Add or upload resume content first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await requestAi({
        task: "resume",
        language: "english",
        modelPreference: "deep",
        prompt: [
          "Analyze this resume for ATS screening.",
          "Return an ATS score out of 100, missing keywords, formatting risks, role targeting gaps, and prioritized improvements.",
          "Be specific and practical.",
        ].join(" "),
        context: resumeText,
      });

      setAtsAnalysis(result.content);
      toast.success("ATS analysis ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("ATS analysis failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!data.name.trim() && !data.summary.trim() && filled(data.experience).length === 0) {
      toast.error("Add some resume details first.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await requestAi({
        task: "resume",
        language: "english",
        modelPreference: "deep",
        prompt:
          "Improve this resume for ATS screening. Rewrite weak bullets with action verbs, measurable impact, and concise wording. Keep it truthful and do not invent companies, dates, or credentials.",
        context: JSON.stringify(data, null, 2),
      });

      setAiSuggestion(result.content);
      toast.success("Resume suggestions ready", {
        description: `Model: ${result.model}`,
      });
    } catch (error) {
      toast.error("AI resume help failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!data.name.trim()) {
      toast.error("Full name is required before downloading.");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = 48;

    const ensureSpace = (height = 24) => {
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addWrappedText = (text: string, fontSize = 10, lineGap = 13, indent = 0) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      lines.forEach((line: string) => {
        ensureSpace(lineGap);
        doc.text(line, margin + indent, y);
        y += lineGap;
      });
    };

    const addSection = (title: string) => {
      ensureSpace(30);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title.toUpperCase(), margin, y);
      y += 5;
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageWidth - margin, y);
      y += 13;
      doc.setFont("helvetica", "normal");
    };

    const addBullets = (items: string[]) => {
      items.forEach((item) => {
        addWrappedText(`- ${item.replace(/^[-*]\s*/, "")}`, 10, 13, 10);
        y += 2;
      });
    };

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(data.name.trim(), pageWidth / 2, y, { align: "center" });
    y += 17;

    if (data.title.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(data.title.trim(), pageWidth / 2, y, { align: "center" });
      y += 14;
    }

    if (contactLine) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(contactLine, pageWidth / 2, y, { align: "center", maxWidth });
      y += 15;
    }

    if (data.summary.trim()) {
      addSection("Professional Summary");
      addWrappedText(data.summary.trim());
    }

    if (filled(data.skills).length) {
      addSection("Skills");
      addWrappedText(filled(data.skills).join(", "));
    }

    if (filled(data.experience).length) {
      addSection("Experience");
      addBullets(filled(data.experience));
    }

    if (filled(data.projects).length) {
      addSection("Projects");
      addBullets(filled(data.projects));
    }

    if (filled(data.education).length) {
      addSection("Education");
      addBullets(filled(data.education));
    }

    doc.save(`${fileSafeName(data.name)}-resume.pdf`);
    toast.success("PDF downloaded", {
      description: "Generated as selectable text for ATS readability.",
    });
  };

  const ListSection = ({ title, field, multiline }: { title: string; field: keyof ResumeData; multiline?: boolean }) => (
    <div className="mb-5">
      <label className="mb-2 block text-sm font-medium text-foreground">{title}</label>
      {(data[field] as string[]).map((item, index) => (
        <div key={`${field}-${index}`} className="mb-2 flex gap-2">
          {multiline ? (
            <Textarea
              value={item}
              onChange={(event) => updateList(field, index, event.target.value)}
              placeholder={`Add ${title.toLowerCase()} with action, impact, and tools...`}
              className="min-h-[78px]"
            />
          ) : (
            <Input
              value={item}
              onChange={(event) => updateList(field, index, event.target.value)}
              placeholder={`Add ${title.toLowerCase()}...`}
            />
          )}
          <Button variant="ghost" size="icon" onClick={() => removeItem(field, index)} className="shrink-0">
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
    <AuthGate title="Login required for Resume Builder" description="Login is required to upload resumes, analyze ATS score, and download resume files.">
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader icon={Pencil} title="Resume Builder" description="Create an ATS-friendly resume and download it as a text-based PDF" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <div className="glass-card p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="mb-3 font-display font-semibold text-foreground">ATS-Friendly Templates</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {atsTemplates.map((template) => (
                <button key={template.name} onClick={() => loadTemplate(template)} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary">
                  <span className="block text-sm font-semibold text-foreground">{template.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{template.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Upload Existing Resume</h3>
            </div>
            <FileUpload onFileSelect={handleResumeUpload} accept=".txt,.md,.csv,.json,.doc,.docx,.pdf" maxSizeMB={8} />
          </div>

          <h3 className="mb-4 font-display font-semibold text-foreground">Your Details</h3>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input value={data.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Full name" />
            <Input value={data.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Target role / headline" />
            <Input value={data.email} onChange={(event) => updateField("email", event.target.value)} placeholder="Email" />
            <Input value={data.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="Phone" />
            <Input value={data.location} onChange={(event) => updateField("location", event.target.value)} placeholder="City, Country" />
            <Input value={data.linkedin} onChange={(event) => updateField("linkedin", event.target.value)} placeholder="LinkedIn URL" />
            <Input value={data.portfolio} onChange={(event) => updateField("portfolio", event.target.value)} placeholder="Portfolio / GitHub" className="sm:col-span-2" />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-foreground">Professional Summary</label>
            <Textarea
              value={data.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              placeholder="2-3 lines focused on role, core skills, and measurable strengths..."
              className="min-h-[92px]"
            />
          </div>

          {listFields.map((section) => (
            <ListSection key={section.field} {...section} />
          ))}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button className="gradient-primary border-0 font-semibold" onClick={handleAiGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isGenerating ? "Improving..." : "AI Improve"}
            </Button>
            <Button variant="outline" onClick={handleAtsAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              ATS Score
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" onClick={() => loadTemplate()} className="gap-2">
              <Wand2 className="h-4 w-4" /> Sample
            </Button>
          </div>

          {aiSuggestion && (
            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">AI Resume Suggestions</h4>
              <GeneratedContent content={aiSuggestion} title="Resume Suggestions" type="resume" />
            </div>
          )}

          {atsAnalysis && (
            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">ATS Score Analysis</h4>
              <GeneratedContent content={atsAnalysis} title="ATS Resume Analysis" type="resume" />
            </div>
          )}
        </div>

        <div className="glass-card p-4 sm:p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">ATS Preview</h3>
          <div className="min-h-[680px] rounded-md border border-border bg-white p-6 text-[#151515] shadow-sm sm:p-8">
            {data.name ? (
              <div className="mx-auto max-w-[720px] text-sm leading-6">
                <div className="mb-5 text-center">
                  <h2 className="font-serif text-2xl font-bold uppercase tracking-normal">{data.name}</h2>
                  {data.title && <p className="mt-1 font-medium">{data.title}</p>}
                  {contactLine && <p className="mt-1 text-xs">{contactLine}</p>}
                </div>

                {data.summary && (
                  <PreviewSection title="Professional Summary">
                    <p>{data.summary}</p>
                  </PreviewSection>
                )}

                {filled(data.skills).length > 0 && (
                  <PreviewSection title="Skills">
                    <p>{filled(data.skills).join(", ")}</p>
                  </PreviewSection>
                )}

                {filled(data.experience).length > 0 && (
                  <PreviewSection title="Experience">
                    <PreviewList items={filled(data.experience)} />
                  </PreviewSection>
                )}

                {filled(data.projects).length > 0 && (
                  <PreviewSection title="Projects">
                    <PreviewList items={filled(data.projects)} />
                  </PreviewSection>
                )}

                {filled(data.education).length > 0 && (
                  <PreviewSection title="Education">
                    <PreviewList items={filled(data.education)} />
                  </PreviewSection>
                )}
              </div>
            ) : (
              <div className="flex min-h-[560px] items-center justify-center text-center text-sm text-muted-foreground">
                Fill in your details or load the ATS template to see a real resume preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthGate>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1 border-b border-[#222] pb-0.5 text-[13px] font-bold uppercase tracking-normal">{title}</h3>
      {children}
    </section>
  );
}

function PreviewList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item.replace(/^[-*]\s*/, "")}</li>
      ))}
    </ul>
  );
}
