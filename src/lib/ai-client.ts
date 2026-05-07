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
  fallbackModels?: string[];
  modelFallbackUsed?: boolean;
}

type StreamHandlers = {
  onDelta?: (delta: string, content: string) => void;
  onContent?: (content: string) => void;
  onModel?: (model: string) => void;
};

type UpgradePromptDetail = {
  reason?: string;
  cooldownUntil?: string;
  plan?: string;
};

interface ApiErrorPayload {
  error?: string | {
    code?: string;
    message?: string;
    detail?: string;
    upgrade?: UpgradePromptDetail;
  };
}

export class AiRequestError extends Error {
  status: number;
  code?: string;
  detail?: string;
  upgrade?: UpgradePromptDetail;

  constructor({
    message,
    status,
    code,
    detail,
    upgrade,
  }: {
    message: string;
    status: number;
    code?: string;
    detail?: string;
    upgrade?: UpgradePromptDetail;
  }) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.upgrade = upgrade;
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
      upgrade: data.error.upgrade,
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
    const shouldPromptUpgrade = ["AI_COOLDOWN_ACTIVE", "AI_QUOTA_EXCEEDED", "AI_ACCESS_DISABLED", "FEATURE_REQUIRES_ADVANCED", "FEATURE_REQUIRES_STANDARD"].includes(parsedError.code || "");

    if (shouldPromptUpgrade && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("study-buddy-upgrade", {
        detail: {
          code: parsedError.code,
          message: parsedError.message,
          detail: parsedError.detail,
          upgrade: parsedError.upgrade,
        },
      }));
    }

    throw new AiRequestError({
      status: response.status,
      code: parsedError.code,
      message: parsedError.message,
      detail: parsedError.detail,
      upgrade: parsedError.upgrade,
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

function dispatchUpgradePrompt(parsedError: { code?: string; message: string; detail?: string; upgrade?: UpgradePromptDetail }) {
  const shouldPromptUpgrade = ["AI_COOLDOWN_ACTIVE", "AI_QUOTA_EXCEEDED", "AI_ACCESS_DISABLED", "FEATURE_REQUIRES_ADVANCED", "FEATURE_REQUIRES_STANDARD"].includes(parsedError.code || "");

  if (shouldPromptUpgrade && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("study-buddy-upgrade", {
      detail: {
        code: parsedError.code,
        message: parsedError.message,
        detail: parsedError.detail,
        upgrade: parsedError.upgrade,
      },
    }));
  }
}

function parseSseMessage(message: string) {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of message.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) return null;

  try {
    return {
      event,
      data: JSON.parse(dataLines.join("\n")) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export async function requestAiStream(payload: AiRequestPayload, handlers: StreamHandlers = {}): Promise<AiResponsePayload> {
  let response: Response;

  try {
    response = await fetch("/api/ai?stream=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
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

  if (!response.ok || !response.body) {
    const rawText = await response.text().catch(() => "");
    let data: ApiErrorPayload | null = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    const parsedError = parseApiError(data, response, rawText);
    dispatchUpgradePrompt(parsedError);
    throw new AiRequestError({
      status: response.status,
      code: parsedError.code,
      message: parsedError.message,
      detail: parsedError.detail,
      upgrade: parsedError.upgrade,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let finalPayload: AiResponsePayload | null = null;

  const handleMessage = (message: string) => {
    const parsed = parseSseMessage(message);
    if (!parsed) return;

    if (parsed.event === "delta") {
      const delta = typeof parsed.data.delta === "string" ? parsed.data.delta : "";
      if (!delta) return;
      content += delta;
      handlers.onDelta?.(delta, content);
      handlers.onContent?.(content);
      return;
    }

    if (parsed.event === "model" && typeof parsed.data.model === "string") {
      handlers.onModel?.(parsed.data.model);
      return;
    }

    if (parsed.event === "done") {
      finalPayload = {
        content: typeof parsed.data.content === "string" ? parsed.data.content : content,
        model: typeof parsed.data.model === "string" ? parsed.data.model : "streamed-model",
        modelKey: typeof parsed.data.modelKey === "string" ? parsed.data.modelKey : "general",
        modelReason: typeof parsed.data.modelReason === "string" ? parsed.data.modelReason : "default",
        fallbackModels: Array.isArray(parsed.data.fallbackModels) ? parsed.data.fallbackModels.filter((item): item is string => typeof item === "string") : undefined,
        modelFallbackUsed: typeof parsed.data.modelFallbackUsed === "boolean" ? parsed.data.modelFallbackUsed : undefined,
      };
      content = finalPayload.content;
      handlers.onContent?.(content);
      return;
    }

    if (parsed.event === "error") {
      const parsedError = {
        code: typeof parsed.data.code === "string" ? parsed.data.code : "AI_SERVER_ERROR",
        message: typeof parsed.data.message === "string" ? parsed.data.message : "AI streaming failed.",
        detail: typeof parsed.data.detail === "string" ? parsed.data.detail : undefined,
      };
      throw new AiRequestError({
        status: 500,
        code: parsedError.code,
        message: parsedError.message,
        detail: parsedError.detail,
      });
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split(/\n\n/);
      buffer = messages.pop() || "";

      for (const message of messages) {
        if (message.trim()) handleMessage(message);
      }
    }

    if (buffer.trim()) handleMessage(buffer);
  } catch (error) {
    if (error instanceof AiRequestError) throw error;
    throw new AiRequestError({
      status: 0,
      code: "AI_STREAM_FAILED",
      message: "AI response stream was interrupted.",
      detail: error instanceof Error ? error.message : undefined,
    });
  }

  if (!finalPayload && content) {
    return {
      content,
      model: "streamed-model",
      modelKey: "general",
      modelReason: "default",
    };
  }

  if (!finalPayload) {
    throw new AiRequestError({
      status: response.status,
      code: "AI_EMPTY_RESPONSE",
      message: "AI returned an empty response.",
    });
  }

  return finalPayload;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof AiRequestError && error.detail) {
    return `${error.message} Details: ${error.detail}`;
  }

  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
