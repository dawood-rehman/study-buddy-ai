"use client";

import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { addLibraryItem, type LibraryItemType } from "@/lib/library-store";
import { useAuth } from "@/lib/auth-context";

export function GeneratedContent({
  content,
  title,
  type,
  className = "",
}: {
  content: string;
  title: string;
  type: LibraryItemType;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Login required", {
        description: "Please login to save content to your library.",
      });
      return;
    }

    try {
      const item = await addLibraryItem({ title, type, content });
      toast.success("Saved to library", {
        description: item.folder,
      });
    } catch (error) {
      toast.error("Save failed", {
        description: error instanceof Error ? error.message : "Could not save to library.",
      });
    }
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" /> Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{content}</div>
    </div>
  );
}
