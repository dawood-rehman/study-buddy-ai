"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

type AdminFeedbackItem = {
  id: string;
  name: string;
  email: string;
  category: "feedback" | "complaint" | "bug" | "feature";
  subject: string;
  message: string;
  status: "open" | "in-review" | "resolved";
  adminReply?: string;
  createdAt: string;
};

async function adminRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message || response.statusText || "Admin request failed.");
  }

  return payload as T;
}

export default function AdminDashboardPage() {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [filter, setFilter] = useState<"all" | AdminFeedbackItem["status"]>("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AdminFeedbackItem["status"]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return filter === "all" ? items : items.filter((item) => item.status === filter);
  }, [filter, items]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const payload = await adminRequest<{ items: AdminFeedbackItem[] }>("/api/admin/feedback");
      setItems(payload.items);
      setAccessError(null);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Could not load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const handleUpdate = async (item: AdminFeedbackItem) => {
    const adminReply = replyDrafts[item.id] ?? item.adminReply ?? "";
    const status = statusDrafts[item.id] ?? item.status;

    try {
      await adminRequest(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ adminReply, status }),
      });
      toast.success("Feedback updated");
      await loadItems();
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AuthGate title="Admin login required" description="Login with an admin email to manage feedback and complaints.">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <PageHeader icon={ShieldCheck} title="Admin Dashboard" description="Receive, reply to, and resolve user feedback and complaints" />
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
            Loading admin messages...
          </div>
        ) : accessError ? (
          <div className="glass-card p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Admin access unavailable</h3>
            <p className="text-sm text-muted-foreground">{accessError}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">No messages found.</div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <article key={item.id} className="glass-card p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-normal text-muted-foreground">{item.category}</p>
                    <h3 className="font-display text-lg font-semibold text-foreground">{item.subject}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.name} - {item.email}</p>
                  </div>
                  <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{item.status}</span>
                </div>
                <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.message}</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-start">
                  <Select
                    value={statusDrafts[item.id] ?? item.status}
                    onValueChange={(value) => setStatusDrafts((current) => ({ ...current, [item.id]: value as AdminFeedbackItem["status"] }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-review">In Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={replyDrafts[item.id] ?? item.adminReply ?? ""}
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Write admin reply..."
                    className="min-h-[96px]"
                  />
                  <Button className="gradient-primary border-0" onClick={() => handleUpdate(item)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Update
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
