import type { AiLanguage, AiTask, ModelPreference } from "@/lib/openrouter";

export interface AiRequestPayload {
  task: AiTask;
  language: AiLanguage;
  prompt: string;
  context?: string;
  modelPreference?: ModelPreference;
  options?: Record<string, unknown>;
}

export interface AiResponsePayload {
  content: string;
  model: string;
  modelKey: string;
  modelReason: string;
}

export async function requestAi(payload: AiRequestPayload): Promise<AiResponsePayload> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "AI request failed. Please try again.");
  }

  if (!data?.content) {
    throw new Error("AI returned an empty response.");
  }

  return data as AiResponsePayload;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
