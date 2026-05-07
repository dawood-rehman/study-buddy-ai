"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex min-h-14 items-center border-b border-border bg-card/50 px-3 backdrop-blur-sm sm:px-4">
            <SidebarTrigger className="hidden md:flex mr-3" />
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <div className="gradient-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <span className="text-primary-foreground text-xs font-bold">S</span>
              </div>
              <span className="truncate font-display font-bold text-foreground">StudyAI</span>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <ThemeToggle />
              {user ? (
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => void signOut()}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </Button>
              )}
            </div>
          </header>
          <main className="w-full min-w-0 flex-1 overflow-x-hidden px-3 py-5 pb-24 sm:px-5 md:px-6 md:py-7 md:pb-8 lg:px-8">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
