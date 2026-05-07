"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Language = "english" | "urdu" | "roman-urdu";

interface LanguageToggleProps {
  value: Language;
  onChange: (lang: Language) => void;
}

const labels: Record<Language, string> = {
  english: "English",
  urdu: "اردو",
  "roman-urdu": "Roman Urdu",
};

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {labels[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(labels) as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => onChange(lang)}
            className={value === lang ? "bg-secondary" : ""}
          >
            {labels[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
