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

interface ApiErrorPayload {
  error?: string | {
    code?: string;
    message?: string;
    detail?: string;
  };
}

export class AiRequestError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor({
    message,
    status,
    code,
    detail,
  }: {
    message: string;
    status: number;
    code?: string;
    detail?: string;
  }) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function parseApiError(data: ApiErrorPayload | null, response: Response, fallbackText?: string) {
  if (typeof data?.error === "string") {
    return {
      message: data.error,
    };
  }

  if (data?.error && typeof data.error === "object") {
    return {
      code: data.error.code,
      message: data.error.message || `AI request failed with status ${response.status}.`,
      detail: data.error.detail,
    };
  }

  if (fallbackText) {
    return {
      message: fallbackText,
    };
  }

  return {
    message: response.statusText || `AI request failed with status ${response.status}.`,
  };
}

export async function requestAi(payload: AiRequestPayload): Promise<AiResponsePayload> {
  let response: Response;

  try {
    response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new AiRequestError({
      status: 0,
      code: "AI_API_UNREACHABLE",
      message: "Could not reach the Study Buddy AI server. Check your connection and try again.",
      detail: error instanceof Error ? error.message : undefined,
    });
  }

  const rawText = await response.text();
  let data: (AiResponsePayload & ApiErrorPayload) | null = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const parsedError = parseApiError(data, response, rawText);

    throw new AiRequestError({
      status: response.status,
      code: parsedError.code,
      message: parsedError.message,
      detail: parsedError.detail,
    });
  }

  if (!data?.content) {
    throw new AiRequestError({
      status: response.status,
      code: "AI_EMPTY_RESPONSE",
      message: "AI returned an empty response.",
    });
  }

  return data as AiResponsePayload;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof AiRequestError && error.detail) {
    return `${error.message} Details: ${error.detail}`;
  }

  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
