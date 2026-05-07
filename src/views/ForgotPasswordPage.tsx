"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, KeyRound, Loader2, MailCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

type ForgotResponse = {
  ok: boolean;
  message: string;
  debugResetUrl?: string;
  emailConfigured?: boolean;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ForgotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Could not send reset link.");
      }

      setResult(payload);
      toast.success("Reset request received");
    } catch (error) {
      toast.error("Password reset failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader icon={KeyRound} title="Forgot Password" description="Request a secure email link to reset your Study Buddy AI password" />

      <section className="glass-card mx-auto max-w-md p-5">
        <div className="space-y-3">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your account email" type="email" />
          <Button className="gradient-primary w-full border-0" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
            Send Reset Link
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
            </Link>
          </Button>
        </div>

        {result ? (
          <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
            <p>{result.message}</p>
            {result.debugResetUrl ? (
              <a className="mt-2 inline-flex font-medium text-primary hover:underline" href={result.debugResetUrl}>
                Open local reset link
              </a>
            ) : null}
            {result.emailConfigured === false ? (
              <p className="mt-2 text-xs">Email service is not configured locally, so this debug link is shown only in development.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
