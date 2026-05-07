"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Library, Search, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLibraryItems, removeLibraryItem, type LibraryItem } from "@/lib/library-store";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      try {
        setIsLoading(true);
        setItems(await getLibraryItems());
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    refresh();
    window.addEventListener("study-buddy-library-updated", refresh);
    return () => {
      window.removeEventListener("study-buddy-library-updated", refresh);
    };
  }, []);

  const folders = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.folder)))], [items]);
  const filteredItems = useMemo(() => {
    const searchable = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !searchable || [item.title, item.folder, item.type, item.content].join(" ").toLowerCase().includes(searchable);
      const matchesFolder = folder === "All" || item.folder === folder;
      return matchesQuery && matchesFolder;
    });
  }, [folder, items, query]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, LibraryItem[]>>((groups, item) => {
      groups[item.folder] = [...(groups[item.folder] || []), item];
      return groups;
    }, {});
  }, [filteredItems]);

  const handleRemove = async (id: string) => {
    await removeLibraryItem(id);
    setItems(await getLibraryItems());
  };

  return (
    <AuthGate title="Login required for Saved Library" description="Login to save, organize, search, and access your generated study content.">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader icon={Library} title="Saved Library" description="Automatically organized folders for books, summaries, AI answers, resumes, and study material" />

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved content..." className="pl-10" />
          </div>
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {folders.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="glass-card p-10 text-center text-sm text-muted-foreground">Loading saved library...</div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Library className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-2 font-display font-semibold text-foreground">Your Library is Empty</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Use Save buttons across generated content and books. Folders are created automatically by content type and title.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedItems).map(([folderName, folderItems]) => (
              <section key={folderName} className="glass-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-foreground">{folderName}</h2>
                  <span className="text-xs text-muted-foreground">({folderItems.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {folderItems.map((item) => (
                    <article key={item.id} className="rounded-md border border-border bg-background p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-xs uppercase tracking-normal text-muted-foreground">{item.type}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.content}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
