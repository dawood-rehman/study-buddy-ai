"use client";

import { Fragment } from "react";
import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { addLibraryItem, type LibraryItemType } from "@/lib/library-store";
import { useAuth } from "@/lib/auth-context";

function renderInline(text: string) {
  const parts = text
    .replace(/`([^`]+)`/g, "$1")
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function isTableStart(lines: string[], index: number) {
  return Boolean(
    lines[index]?.includes("|")
    && lines[index + 1]?.includes("|")
    && /-/.test(lines[index + 1]),
  );
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const elements: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      elements.push(<hr key={index} className="my-5 border-border" />);
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].replace(/^\d+\s+/, "");
      const className = level <= 2
        ? "mt-5 mb-3 font-display text-xl font-semibold text-foreground"
        : "mt-4 mb-2 font-display text-base font-semibold text-foreground";

      elements.push(level <= 2
        ? <h2 key={index} className={className}>{renderInline(text)}</h2>
        : <h3 key={index} className={className}>{renderInline(text)}</h3>);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = parseTableRow(lines[index]);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].includes("|")) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }

      elements.push(
        <div key={`table-${index}`} className="responsive-scroll my-4 rounded-md border border-border">
          <table className="min-w-[560px] w-full border-collapse text-left text-sm">
            <thead className="bg-secondary/70 text-secondary-foreground">
              <tr>
                {header.map((cell) => (
                  <th key={cell} className="border-b border-border px-3 py-2 font-semibold">{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${row.join("-")}-${rowIndex}`} className="odd:bg-background even:bg-secondary/20">
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`} className="border-b border-border px-3 py-2 align-top leading-6">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];

      while (index < lines.length && /^([-*]|\d+\.)\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^([-*]|\d+\.)\s+/, ""));
        index += 1;
      }

      const ListTag = ordered ? "ol" : "ul";
      elements.push(
      <ListTag key={`list-${index}`} className={`my-3 space-y-2 pl-5 text-sm leading-6 break-words ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>)}
        </ListTag>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^(#{1,4})\s+/.test(lines[index].trim())
      && !/^-{3,}$/.test(lines[index].trim())
      && !/^([-*]|\d+\.)\s+/.test(lines[index].trim())
      && !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    elements.push(
      <p key={`p-${index}`} className="my-3 break-words text-sm leading-7 text-foreground">
        {renderInline(paragraph.join(" "))}
      </p>,
    );
  }

  return <div className="responsive-panel rounded-md border border-border bg-background p-4 sm:p-5">{elements}</div>;
}

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
        <Button variant="outline" size="sm" className="min-w-0" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" /> Copy
        </Button>
        <Button variant="outline" size="sm" className="min-w-0" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>
      <MarkdownRenderer content={content} />
    </div>
  );
}
