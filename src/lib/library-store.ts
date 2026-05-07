"use client";

import type { LibraryItemType } from "@/lib/library-utils";

export type { LibraryItemType };

export type LibraryItem = {
  id: string;
  title: string;
  folder: string;
  type: LibraryItemType;
  content: string;
  source?: string;
  createdAt: string;
};

type ApiErrorPayload = {
  error?: string | {
    message?: string;
  };
};

function parseApiError(payload: ApiErrorPayload | null, fallback: string) {
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

async function libraryRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseApiError(payload, response.statusText || "Library request failed."));
  }

  return payload as T;
}

export async function addLibraryItem(input: Omit<LibraryItem, "id" | "folder" | "createdAt"> & { folder?: string }) {
  const payload = await libraryRequest<{ item: LibraryItem }>("/api/library", {
    method: "POST",
    body: JSON.stringify(input),
  });

  window.dispatchEvent(new CustomEvent("study-buddy-library-updated"));
  return payload.item;
}

export async function getLibraryItems() {
  const payload = await libraryRequest<{ items: LibraryItem[] }>("/api/library");
  return payload.items;
}

export async function removeLibraryItem(id: string) {
  await libraryRequest<{ ok: boolean }>(`/api/library/${id}`, { method: "DELETE" });
  window.dispatchEvent(new CustomEvent("study-buddy-library-updated"));
}
