"use client";

import { useState } from "react";
import Link from "next/link";
import { Chrome, Loader2, LogIn, UserPlus } from "lucide-react";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (mode: "login" | "signup") => {
    setIsLoading(true);
    try {
      if (mode === "signup") {
        await signUp({ name, email, password });
        toast.success("Account created");
      } else {
        await signIn({ email, password });
        toast.success("Signed in");
      }
    } catch (error) {
      toast.error(mode === "signup" ? "Signup failed" : "Login failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="login" className="glass-card mx-auto w-full max-w-md p-5">
      <TabsList className="mb-5 grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="space-y-3">
        <Button variant="outline" className="w-full" onClick={() => void nextAuthSignIn("google", { callbackUrl: "/login" })}>
          <Chrome className="mr-2 h-4 w-4" /> Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>Email login</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
        <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
        <Button className="gradient-primary w-full border-0" onClick={() => handleSubmit("login")} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          Login
        </Button>
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </TabsContent>
      <TabsContent value="signup" className="space-y-3">
        <Button variant="outline" className="w-full" onClick={() => void nextAuthSignIn("google", { callbackUrl: "/login" })}>
          <Chrome className="mr-2 h-4 w-4" /> Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>Email signup</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
        <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
        <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (8+ characters)" type="password" />
        <Button className="gradient-primary w-full border-0" onClick={() => handleSubmit("signup")} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Create Account
        </Button>
      </TabsContent>
    </Tabs>
  );
}
