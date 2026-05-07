"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Reset token missing", {
        description: "Please open the latest reset link from your email.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Password could not be reset.");
      }

      setIsComplete(true);
      toast.success("Password reset successfully");
      window.setTimeout(() => router.push("/login"), 1200);
    } catch (error) {
      toast.error("Reset failed", {
        description: error instanceof Error ? error.message : "Please request a new reset link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader icon={KeyRound} title="Reset Password" description="Create a new secure password for your Study Buddy AI account" />

      <section className="glass-card mx-auto max-w-md p-5">
        {isComplete ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Password updated</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">You are being redirected to login.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password (8+ characters)" type="password" />
            <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" type="password" />
            <Button className="gradient-primary w-full border-0" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Reset Password
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
