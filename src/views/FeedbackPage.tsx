"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

type FeedbackItem = {
  id: string;
  category: "feedback" | "complaint" | "bug" | "feature";
  subject: string;
  message: string;
  status: "open" | "in-review" | "resolved";
  adminReply?: string;
  createdAt: string;
};

async function feedbackRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message || response.statusText || "Feedback request failed.");
  }

  return payload as T;
}

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackItem["category"]>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const payload = await feedbackRequest<{ items: FeedbackItem[] }>("/api/feedback");
      setItems(payload.items);
    } catch (error) {
      toast.error("Could not load feedback", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, []);

  const handleSubmit = async () => {
    setIsSending(true);
    try {
      await feedbackRequest<{ item: FeedbackItem }>("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category, subject, message }),
      });
      setSubject("");
      setMessage("");
      toast.success("Message sent to admin");
      await loadFeedback();
    } catch (error) {
      toast.error("Message not sent", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthGate title="Login required for feedback" description="Login to send feedback, complaints, and follow admin replies.">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader icon={MessageSquarePlus} title="Feedback & Complaints" description="Send feedback, complaints, bugs, or feature requests directly to admin" />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="glass-card p-5">
            <h3 className="mb-4 font-display font-semibold text-foreground">Send a Message</h3>
            <div className="space-y-3">
              <Select value={category} onValueChange={(value) => setCategory(value as FeedbackItem["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                </SelectContent>
              </Select>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
              <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your message for admin..." className="min-h-[180px]" />
              <Button className="gradient-primary w-full border-0" onClick={handleSubmit} disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send to Admin
              </Button>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-display font-semibold text-foreground">Your Messages</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback or complaints sent yet.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <article key={item.id} className="rounded-md border border-border bg-background p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-foreground">{item.subject}</h4>
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{item.status}</span>
                    </div>
                    <p className="mb-2 text-xs uppercase tracking-normal text-muted-foreground">{item.category}</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.message}</p>
                    {item.adminReply && (
                      <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-normal text-primary">Admin Reply</p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{item.adminReply}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
