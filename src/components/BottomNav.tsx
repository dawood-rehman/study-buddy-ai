"use client";

import { BookOpen, Brain, Home, LayoutDashboard, Library } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { icon: Home, label: "Home", to: "/" },
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: BookOpen, label: "Study", to: "/study" },
  { icon: Brain, label: "Quiz", to: "/quiz" },
  { icon: Library, label: "Library", to: "/library" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex justify-around py-2">
        {items.map(({ icon: Icon, label, to }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              href={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
