"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, CheckCircle2, CreditCard, Loader2, Plus, ShieldCheck, Trash2, Upload, Users } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { bookCategories, bookLanguages } from "@/lib/books";

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

type AdminBookItem = {
  id: string;
  sourceId?: string;
  title: string;
  authors: string[];
  genres: string[];
  languages: string[];
  tags: string[];
  summaries: string[];
  coverUrl?: string;
  textUrl?: string;
  htmlUrl?: string;
  epubUrl?: string;
  pdfUrl?: string;
  sourceUrl?: string;
  fullText?: string;
  estimatedPages?: string;
  status?: "active" | "draft";
};

type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  authProvider: string;
  aiQuotaLimit: number;
  aiDisabled: boolean;
  subscriptionPlan: "free" | "standard" | "advanced";
  subscriptionStatus: "active" | "inactive" | "past_due" | "cancelled" | "pending";
  subscriptionLabel: string;
  subscriptionExpiresAt?: string | null;
  aiCooldownUntil?: string | null;
  permissions: string[];
  monthlyUsage: {
    requests: number;
    successfulRequests: number;
    estimatedTokens: number;
  };
};

type AdminPaymentItem = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: "standard" | "advanced";
  method: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  transactionId: string;
  note: string;
  createdAt: string;
};

type AdminPaymentsPayload = {
  payments: AdminPaymentItem[];
  summary: {
    revenue: number;
    approvedPayments: number;
    activeSubscribers: number;
    pendingPayments: number;
  };
};

type AdminUsagePayload = {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    blockedRequests: number;
    averageDurationMs: number;
    estimatedTokens: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    successfulRequests: number;
    averageDurationMs: number;
  }>;
  byDay: Array<{
    day: string;
    requests: number;
    successfulRequests: number;
  }>;
  logs: Array<{
    id: string;
    email: string;
    task: string;
    language: string;
    resolvedModel: string;
    status: string;
    durationMs: number;
    estimatedTokens: number;
    errorCode?: string | null;
    createdAt: string;
  }>;
};

type UserDraftState = {
  name: string;
  email: string;
  aiQuotaLimit: number;
  aiDisabled: boolean;
  subscriptionPlan: "free" | "standard" | "advanced";
  subscriptionStatus: "active" | "inactive" | "past_due" | "cancelled" | "pending";
  subscriptionExpiresAt: string;
  clearCooldown: boolean;
  permissions: string;
};

type PaymentFormState = {
  userId: string;
  plan: "standard" | "advanced";
  method: "easypaisa" | "jazzcash" | "bank" | "stripe" | "paypal" | "paddle" | "lemon-squeezy" | "manual";
  amount: string;
  currency: string;
  transactionId: string;
  note: string;
};

type BookFormState = {
  title: string;
  authors: string;
  genres: string;
  language: string;
  tags: string;
  description: string;
  coverUrl: string;
  textUrl: string;
  htmlUrl: string;
  epubUrl: string;
  pdfUrl: string;
  sourceUrl: string;
  fullText: string;
  estimatedPages: string;
  status: "active" | "draft";
};

const emptyBookForm: BookFormState = {
  title: "",
  authors: "",
  genres: "novels",
  language: "en",
  tags: "",
  description: "",
  coverUrl: "",
  textUrl: "",
  htmlUrl: "",
  epubUrl: "",
  pdfUrl: "",
  sourceUrl: "",
  fullText: "",
  estimatedPages: "",
  status: "active",
};

const emptyPaymentForm: PaymentFormState = {
  userId: "",
  plan: "standard",
  method: "easypaisa",
  amount: "3",
  currency: "USD",
  transactionId: "",
  note: "",
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
  const [books, setBooks] = useState<AdminBookItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usage, setUsage] = useState<AdminUsagePayload | null>(null);
  const [payments, setPayments] = useState<AdminPaymentsPayload | null>(null);
  const [bookForm, setBookForm] = useState<BookFormState>(emptyBookForm);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm);
  const [bookDrafts, setBookDrafts] = useState<Record<string, BookFormState>>({});
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraftState>>({});
  const [selectedBookFile, setSelectedBookFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<"all" | AdminFeedbackItem["status"]>("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AdminFeedbackItem["status"]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isBooksLoading, setIsBooksLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(true);
  const [isFileUploading, setIsFileUploading] = useState(false);
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

  const loadBooks = async () => {
    setIsBooksLoading(true);
    try {
      const payload = await adminRequest<{ books: AdminBookItem[] }>("/api/admin/books");
      setBooks(payload.books);
      setAccessError(null);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Could not load admin books.");
    } finally {
      setIsBooksLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const payload = await adminRequest<{ users: AdminUserItem[] }>("/api/admin/users");
      setUsers(payload.users);
      setAccessError(null);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Could not load admin users.");
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadUsage = async () => {
    setIsUsageLoading(true);
    try {
      const payload = await adminRequest<AdminUsagePayload>("/api/admin/usage");
      setUsage(payload);
      setAccessError(null);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Could not load AI usage.");
    } finally {
      setIsUsageLoading(false);
    }
  };

  const loadPayments = async () => {
    setIsPaymentsLoading(true);
    try {
      const payload = await adminRequest<AdminPaymentsPayload>("/api/admin/payments");
      setPayments(payload);
      setAccessError(null);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Could not load payments.");
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    void loadBooks();
    void loadUsers();
    void loadUsage();
    void loadPayments();
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

  const toBookPayload = (form: BookFormState) => ({
    title: form.title,
    authors: form.authors,
    genres: form.genres,
    language: form.language,
    tags: form.tags,
    description: form.description,
    coverUrl: form.coverUrl,
    textUrl: form.textUrl,
    htmlUrl: form.htmlUrl,
    epubUrl: form.epubUrl,
    pdfUrl: form.pdfUrl,
    sourceUrl: form.sourceUrl,
    fullText: form.fullText,
    estimatedPages: form.estimatedPages,
    status: form.status,
  });

  const bookToForm = (book: AdminBookItem): BookFormState => ({
    title: book.title,
    authors: book.authors.join(", "),
    genres: book.genres.join(", "),
    language: book.languages[0] || "en",
    tags: book.tags.join(", "),
    description: book.summaries[0] || "",
    coverUrl: book.coverUrl || "",
    textUrl: book.textUrl || "",
    htmlUrl: book.htmlUrl || "",
    epubUrl: book.epubUrl || "",
    pdfUrl: book.pdfUrl || "",
    sourceUrl: book.sourceUrl || "",
    fullText: book.fullText || "",
    estimatedPages: book.estimatedPages || "",
    status: book.status || "active",
  });

  const userToDraft = (user: AdminUserItem): UserDraftState => ({
    name: user.name,
    email: user.email,
    aiQuotaLimit: user.aiQuotaLimit,
    aiDisabled: user.aiDisabled,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt?.slice(0, 10) || "",
    clearCooldown: false,
    permissions: user.permissions.join(", "),
  });

  const handleCreateBook = async () => {
    try {
      await adminRequest("/api/admin/books", {
        method: "POST",
        body: JSON.stringify(toBookPayload(bookForm)),
      });
      toast.success("Book added");
      setBookForm(emptyBookForm);
      await loadBooks();
    } catch (error) {
      toast.error("Book create failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleUploadBookFile = async () => {
    if (!selectedBookFile) {
      toast.error("Choose a PDF, TXT, or EPUB file first.");
      return;
    }

    setIsFileUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedBookFile);
      const response = await fetch("/api/admin/books/upload", {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "File upload failed.");
      }

      const file = payload.file as { url: string; fileName: string; contentType: string };
      const patch: Partial<BookFormState> = {
        sourceUrl: file.url,
        estimatedPages: bookForm.estimatedPages || "Uploaded file",
      };

      if (file.contentType === "application/pdf") patch.pdfUrl = file.url;
      if (file.contentType === "text/plain") patch.textUrl = file.url;
      if (file.contentType === "application/epub+zip") patch.epubUrl = file.url;
      if (!bookForm.title) patch.title = file.fileName.replace(/\.[^.]+$/, "");

      updateBookForm(patch);
      toast.success("File uploaded", {
        description: "The file URL was added to the book form.",
      });
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleUpdateBook = async (book: AdminBookItem) => {
    const id = book.sourceId || book.id.replace("admin-", "");
    const form = bookDrafts[book.id] || bookToForm(book);

    try {
      await adminRequest(`/api/admin/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify(toBookPayload(form)),
      });
      toast.success("Book updated");
      await loadBooks();
    } catch (error) {
      toast.error("Book update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleDeleteBook = async (book: AdminBookItem) => {
    const id = book.sourceId || book.id.replace("admin-", "");

    try {
      await adminRequest(`/api/admin/books/${id}`, { method: "DELETE" });
      toast.success("Book deleted");
      await loadBooks();
    } catch (error) {
      toast.error("Book delete failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const updateBookForm = (patch: Partial<BookFormState>) => setBookForm((current) => ({ ...current, ...patch }));
  const updateBookDraft = (book: AdminBookItem, patch: Partial<BookFormState>) => {
    setBookDrafts((current) => ({
      ...current,
      [book.id]: {
        ...(current[book.id] || bookToForm(book)),
        ...patch,
      },
    }));
  };
  const updateUserDraft = (user: AdminUserItem, patch: Partial<UserDraftState>) => {
    setUserDrafts((current) => ({
      ...current,
      [user.id]: {
        ...(current[user.id] || userToDraft(user)),
        ...patch,
      },
    }));
  };

  const handleUpdateUser = async (user: AdminUserItem) => {
    const draft = userDrafts[user.id] || userToDraft(user);

    try {
      await adminRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...draft,
          aiQuotaLimit: Number(draft.aiQuotaLimit),
          subscriptionExpiresAt: draft.subscriptionExpiresAt || null,
          permissions: draft.permissions.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      toast.success("User updated");
      await Promise.all([loadUsers(), loadUsage()]);
    } catch (error) {
      toast.error("User update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.userId) {
      toast.error("Select a user first.");
      return;
    }

    try {
      await adminRequest("/api/admin/payments", {
        method: "POST",
        body: JSON.stringify({
          ...paymentForm,
          amount: Number(paymentForm.amount),
        }),
      });
      toast.success("Payment record created");
      setPaymentForm(emptyPaymentForm);
      await loadPayments();
    } catch (error) {
      toast.error("Payment create failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handlePaymentStatus = async (payment: AdminPaymentItem, status: AdminPaymentItem["status"]) => {
    try {
      await adminRequest(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: payment.note }),
      });
      toast.success(status === "approved" ? "Subscription activated" : "Payment updated");
      await Promise.all([loadPayments(), loadUsers()]);
    } catch (error) {
      toast.error("Payment update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    try {
      await adminRequest(`/api/admin/users/${user.id}`, { method: "DELETE" });
      toast.success("User deleted");
      await Promise.all([loadUsers(), loadUsage()]);
    } catch (error) {
      toast.error("User delete failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleClearCooldown = async (user: AdminUserItem) => {
    try {
      await adminRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ clearCooldown: true }),
      });
      toast.success("AI cooldown cleared");
      await loadUsers();
    } catch (error) {
      toast.error("Cooldown update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AuthGate title="Admin login required" description="Login with an admin email to manage feedback and complaints.">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader icon={ShieldCheck} title="Admin Dashboard" description="Manage feedback, books, users, quotas, and AI activity" />

        {accessError ? (
          <div className="glass-card p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Admin access unavailable</h3>
            <p className="text-sm text-muted-foreground">{accessError}</p>
          </div>
        ) : (
          <Tabs defaultValue="feedback" className="mt-6">
            <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="books">Books</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="usage">AI Usage</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            </TabsList>

            <TabsContent value="feedback">
              <div className="mb-4 flex justify-stretch sm:justify-end">
                <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
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
              ) : filteredItems.length === 0 ? (
                <div className="glass-card p-8 text-center text-sm text-muted-foreground">No messages found.</div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => (
                    <article key={item.id} className="glass-card p-4 sm:p-5">
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
                        <Button className="gradient-primary w-full border-0 md:w-auto" onClick={() => handleUpdate(item)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Update
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="books">
              <div className="glass-card p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-foreground">Add New Book</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input value={bookForm.title} onChange={(event) => updateBookForm({ title: event.target.value })} placeholder="Book title" />
                  <Input value={bookForm.authors} onChange={(event) => updateBookForm({ authors: event.target.value })} placeholder="Authors, comma separated" />
                  <Select value={bookForm.genres.split(",")[0]?.trim() || "novels"} onValueChange={(value) => updateBookForm({ genres: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {bookCategories.filter((item) => item.id !== "all").map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={bookForm.language} onValueChange={(value) => updateBookForm({ language: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {bookLanguages.filter((item) => item.id !== "all").map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={bookForm.tags} onChange={(event) => updateBookForm({ tags: event.target.value })} placeholder="Tags, comma separated" />
                  <Input value={bookForm.estimatedPages} onChange={(event) => updateBookForm({ estimatedPages: event.target.value })} placeholder="Pages e.g. 120, 3000, Full text" />
                  <Input value={bookForm.coverUrl} onChange={(event) => updateBookForm({ coverUrl: event.target.value })} placeholder="Cover image URL" />
                  <Input value={bookForm.sourceUrl} onChange={(event) => updateBookForm({ sourceUrl: event.target.value })} placeholder="Source / metadata URL" />
                  <Input value={bookForm.textUrl} onChange={(event) => updateBookForm({ textUrl: event.target.value })} placeholder="Plain text URL for reader" />
                  <Input value={bookForm.pdfUrl} onChange={(event) => updateBookForm({ pdfUrl: event.target.value })} placeholder="PDF URL for download" />
                  <Input value={bookForm.epubUrl} onChange={(event) => updateBookForm({ epubUrl: event.target.value })} placeholder="EPUB / offline book URL" />
                  <Select value={bookForm.status} onValueChange={(value) => updateBookForm({ status: value as BookFormState["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 rounded-md border border-border bg-background p-3">
                  <label className="mb-2 block text-sm font-medium text-foreground">Upload PDF / Book File</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      type="file"
                      accept="application/pdf,text/plain,application/epub+zip,.pdf,.txt,.epub"
                      onChange={(event) => setSelectedBookFile(event.target.files?.[0] || null)}
                    />
                    <Button type="button" variant="outline" className="w-full md:w-auto" onClick={handleUploadBookFile} disabled={isFileUploading}>
                      {isFileUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload File
                    </Button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Uploaded files are stored in MongoDB and can be used for online reading or download. Only upload books you own or have permission to distribute.
                  </p>
                </div>
                <Textarea value={bookForm.description} onChange={(event) => updateBookForm({ description: event.target.value })} placeholder="Description / summary" className="mt-3 min-h-[90px]" />
                <Textarea value={bookForm.fullText} onChange={(event) => updateBookForm({ fullText: event.target.value })} placeholder="Optional full text for online reader and PDF generation" className="mt-3 min-h-[130px]" />
                <Button className="gradient-primary mt-4 border-0" onClick={handleCreateBook}>
                  <Plus className="mr-2 h-4 w-4" /> Add Book
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                {isBooksLoading ? (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                    Loading books...
                  </div>
                ) : books.length === 0 ? (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">No admin books yet.</div>
                ) : (
                  books.map((book) => {
                    const draft = bookDrafts[book.id] || bookToForm(book);
                    return (
                      <article key={book.id} className="glass-card p-4 sm:p-5">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-lg font-semibold text-foreground">{book.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{book.authors.join(", ")} - {book.languages[0]} - {book.status}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteBook(book)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Input value={draft.title} onChange={(event) => updateBookDraft(book, { title: event.target.value })} />
                          <Input value={draft.authors} onChange={(event) => updateBookDraft(book, { authors: event.target.value })} />
                          <Input value={draft.genres} onChange={(event) => updateBookDraft(book, { genres: event.target.value })} />
                          <Input value={draft.tags} onChange={(event) => updateBookDraft(book, { tags: event.target.value })} />
                          <Input value={draft.language} onChange={(event) => updateBookDraft(book, { language: event.target.value })} />
                          <Input value={draft.estimatedPages} onChange={(event) => updateBookDraft(book, { estimatedPages: event.target.value })} />
                          <Input value={draft.coverUrl} onChange={(event) => updateBookDraft(book, { coverUrl: event.target.value })} />
                          <Input value={draft.sourceUrl} onChange={(event) => updateBookDraft(book, { sourceUrl: event.target.value })} />
                          <Input value={draft.textUrl} onChange={(event) => updateBookDraft(book, { textUrl: event.target.value })} />
                          <Input value={draft.pdfUrl} onChange={(event) => updateBookDraft(book, { pdfUrl: event.target.value })} />
                        </div>
                        <Textarea value={draft.description} onChange={(event) => updateBookDraft(book, { description: event.target.value })} className="mt-3 min-h-[90px]" />
                        <Button className="mt-3" variant="outline" onClick={() => handleUpdateBook(book)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Save Metadata
                        </Button>
                      </article>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="users">
              {isUsersLoading ? (
                <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="glass-card p-8 text-center text-sm text-muted-foreground">No users found.</div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => {
                    const draft = userDrafts[user.id] || userToDraft(user);
                    return (
                      <article key={user.id} className="glass-card p-4 sm:p-5">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="feature-icon bg-secondary">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-display text-lg font-semibold text-foreground">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email} - {user.role} - {user.authProvider}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{user.subscriptionLabel} - {user.subscriptionStatus}{user.aiCooldownUntil ? " - Cooldown active" : ""}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{user.monthlyUsage.requests} requests this month</p>
                            <p>{user.monthlyUsage.estimatedTokens.toLocaleString()} estimated tokens</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <Input value={draft.name} onChange={(event) => updateUserDraft(user, { name: event.target.value })} placeholder="Name" />
                          <Input value={draft.email} onChange={(event) => updateUserDraft(user, { email: event.target.value })} placeholder="Email" type="email" />
                          <Input value={String(draft.aiQuotaLimit)} onChange={(event) => updateUserDraft(user, { aiQuotaLimit: Number(event.target.value) })} placeholder="Monthly AI quota" type="number" min="0" />
                          <Select value={draft.aiDisabled ? "disabled" : "enabled"} onValueChange={(value) => updateUserDraft(user, { aiDisabled: value === "disabled" })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enabled">AI Enabled</SelectItem>
                              <SelectItem value="disabled">AI Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={draft.subscriptionPlan} onValueChange={(value) => updateUserDraft(user, { subscriptionPlan: value as UserDraftState["subscriptionPlan"] })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="standard">Standard - $3</SelectItem>
                              <SelectItem value="advanced">Advanced - $5</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={draft.subscriptionStatus} onValueChange={(value) => updateUserDraft(user, { subscriptionStatus: value as UserDraftState["subscriptionStatus"] })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="past_due">Past Due</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={draft.subscriptionExpiresAt} onChange={(event) => updateUserDraft(user, { subscriptionExpiresAt: event.target.value })} placeholder="Expires at" type="date" />
                          <Input value={draft.permissions} onChange={(event) => updateUserDraft(user, { permissions: event.target.value })} placeholder="Permissions, comma separated" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => handleUpdateUser(user)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Save User
                          </Button>
                          {user.aiCooldownUntil ? (
                            <Button variant="outline" onClick={() => handleClearCooldown(user)}>
                              Clear Cooldown
                            </Button>
                          ) : null}
                          <Button variant="outline" onClick={() => handleDeleteUser(user)} disabled={user.role === "admin"}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="usage">
              {isUsageLoading || !usage ? (
                <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                  Loading AI usage...
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Requests", usage.summary.totalRequests.toLocaleString()],
                      ["Success", usage.summary.successfulRequests.toLocaleString()],
                      ["Failed/Blocked", (usage.summary.failedRequests + usage.summary.blockedRequests).toLocaleString()],
                      ["Avg Time", `${usage.summary.averageDurationMs} ms`],
                    ].map(([label, value]) => (
                      <div key={label} className="glass-card p-4">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
                        <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <section className="glass-card p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-lg font-semibold text-foreground">Model Activity</h2>
                      </div>
                      <div className="space-y-3">
                        {usage.byModel.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No model activity yet.</p>
                        ) : usage.byModel.map((item) => (
                          <div key={item.model} className="rounded-md border border-border bg-background p-3">
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="font-medium text-foreground">{item.model}</span>
                              <span className="text-muted-foreground">{item.requests} requests</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{item.successfulRequests} success - avg {item.averageDurationMs} ms</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="glass-card p-4 sm:p-5">
                      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Daily Requests</h2>
                      <div className="space-y-2">
                        {usage.byDay.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No daily usage yet.</p>
                        ) : usage.byDay.map((item) => (
                          <div key={item.day} className="grid grid-cols-[86px_minmax(0,1fr)_44px] items-center gap-2 text-xs sm:grid-cols-[110px_minmax(0,1fr)_60px] sm:gap-3 sm:text-sm">
                            <span className="text-muted-foreground">{item.day}</span>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.requests * 8)}%` }} />
                            </div>
                            <span className="text-right font-medium text-foreground">{item.requests}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section className="glass-card p-4 sm:p-5">
                    <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent AI Logs</h2>
                    <div className="max-h-[520px] overflow-auto">
                      <div className="min-w-[760px] divide-y divide-border text-sm">
                        {usage.logs.length === 0 ? (
                          <p className="py-6 text-center text-muted-foreground">No logs yet.</p>
                        ) : usage.logs.map((log) => (
                          <div key={log.id} className="grid grid-cols-[170px_160px_90px_150px_90px_90px] gap-3 py-3">
                            <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                            <span className="truncate font-medium text-foreground">{log.email}</span>
                            <span className="text-muted-foreground">{log.task}</span>
                            <span className="truncate text-muted-foreground">{log.resolvedModel}</span>
                            <span className={log.status === "success" ? "text-primary" : "text-destructive"}>{log.status}</span>
                            <span className="text-right text-muted-foreground">{log.durationMs} ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </TabsContent>

            <TabsContent value="subscriptions">
              {isPaymentsLoading || !payments ? (
                <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                  Loading subscriptions...
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Revenue", `${payments.summary.revenue.toLocaleString()} USD`],
                      ["Approved", payments.summary.approvedPayments.toLocaleString()],
                      ["Active Subscribers", payments.summary.activeSubscribers.toLocaleString()],
                      ["Pending", payments.summary.pendingPayments.toLocaleString()],
                    ].map(([label, value]) => (
                      <div key={label} className="glass-card p-4">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
                        <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  <section className="glass-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-lg font-semibold text-foreground">Create Payment Verification</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <Select value={paymentForm.userId} onValueChange={(value) => setPaymentForm((current) => ({ ...current, userId: value }))}>
                        <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={paymentForm.plan} onValueChange={(value) => setPaymentForm((current) => ({ ...current, plan: value as PaymentFormState["plan"], amount: value === "advanced" ? "5" : "3" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard - $3/month</SelectItem>
                          <SelectItem value="advanced">Advanced - $5/month</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={paymentForm.method} onValueChange={(value) => setPaymentForm((current) => ({ ...current, method: value as PaymentFormState["method"] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easypaisa">Easypaisa</SelectItem>
                          <SelectItem value="jazzcash">JazzCash</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="paddle">Paddle</SelectItem>
                          <SelectItem value="lemon-squeezy">Lemon Squeezy</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" type="number" min="0" />
                      <Input value={paymentForm.currency} onChange={(event) => setPaymentForm((current) => ({ ...current, currency: event.target.value }))} placeholder="Currency" />
                      <Input value={paymentForm.transactionId} onChange={(event) => setPaymentForm((current) => ({ ...current, transactionId: event.target.value }))} placeholder="Transaction ID" />
                    </div>
                    <Textarea value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} placeholder="Payment note, screenshot reference, bank details, or admin comment" className="mt-3 min-h-[90px]" />
                    <Button className="gradient-primary mt-4 border-0" onClick={handleCreatePayment}>
                      <Plus className="mr-2 h-4 w-4" /> Add Payment
                    </Button>
                  </section>

                  <section className="glass-card p-4 sm:p-5">
                    <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Payment Instructions</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                        <h3 className="mb-2 font-display font-semibold text-foreground">Pakistan</h3>
                        <p>Easypaisa, JazzCash, and bank transfer are handled through manual verification. Add the transaction record, then approve it to activate the subscription for one month.</p>
                      </div>
                      <div className="rounded-md border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                        <h3 className="mb-2 font-display font-semibold text-foreground">International</h3>
                        <p>Stripe and Lemon Squeezy records can be tracked here when provider webhooks activate subscriptions automatically.</p>
                      </div>
                    </div>
                  </section>

                  <section className="glass-card p-4 sm:p-5">
                    <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Payment Verifications</h2>
                    <div className="space-y-3">
                      {payments.payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payment records yet.</p>
                      ) : payments.payments.map((payment) => (
                        <article key={payment.id} className="rounded-md border border-border bg-background p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="font-display font-semibold text-foreground">{payment.userName || payment.userEmail}</h3>
                              <p className="text-sm text-muted-foreground">{payment.plan} - {payment.method} - {payment.amount} {payment.currency}</p>
                              <p className="mt-1 text-xs text-muted-foreground">TX: {payment.transactionId || "n/a"} - {new Date(payment.createdAt).toLocaleString()}</p>
                            </div>
                            <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{payment.status}</span>
                          </div>
                          {payment.note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{payment.note}</p> : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePaymentStatus(payment, "approved")} disabled={payment.status === "approved"}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePaymentStatus(payment, "rejected")} disabled={payment.status === "rejected"}>
                              Reject
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AuthGate>
  );
}
