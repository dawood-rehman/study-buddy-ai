"use client";

import { BookOpen, Bot, Home, LayoutDashboard, Library } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { icon: Home, label: "Home", to: "/" },
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: BookOpen, label: "Study", to: "/study" },
  { icon: Bot, label: "AI", to: "/ai" },
  { icon: Library, label: "Library", to: "/library" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav md:hidden">
      <div className="grid grid-cols-5 gap-1 px-1 py-2">
        {items.map(({ icon: Icon, label, to }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              href={to}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-center transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="w-full truncate text-[10px] font-medium leading-3">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
