"use client";

import Link from "next/link";
import { LogIn, UserCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger className="hidden md:flex mr-3" />
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">S</span>
              </div>
              <span className="font-display font-bold text-foreground">StudyAI</span>
            </div>
            <div className="ml-auto">
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link href="/login">
                  {user ? <UserCircle className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  <span className="hidden sm:inline">{user ? user.name : "Login"}</span>
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 pb-24 sm:px-5 md:px-6 md:py-7 md:pb-8 lg:px-8">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
