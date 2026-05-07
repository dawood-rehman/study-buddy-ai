"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AuthGate({
  children,
  title = "Login required",
  description = "Create an account or sign in to use this feature.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <div className="glass-card p-6 text-sm text-muted-foreground">Loading account...</div>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="glass-card p-8 text-center">
      <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-primary" />
      <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">{description}</p>
      <Button asChild className="gradient-primary border-0">
        <Link href="/login">Login or Sign Up</Link>
      </Button>
    </div>
  );
}
