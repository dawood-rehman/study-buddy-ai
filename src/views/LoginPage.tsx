"use client";

import { ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader icon={ShieldCheck} title="Account Access" description="Login to unlock uploads, downloads, saved library, books, counseling, and resume tools" />
      {user ? (
        <div className="glass-card p-6">
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">Signed in as {user.name}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{user.email}</p>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      ) : (
        <AuthForm />
      )}
    </div>
  );
}
