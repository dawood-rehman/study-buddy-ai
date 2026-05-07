import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { buildOpenRouterMessages, selectOpenRouterModel } from "@/lib/openrouter";

export const runtime = "nodejs";

const aiRequestSchema = z.object({
  task: z.enum(["study", "quiz", "summary", "past-paper", "grammar", "counseling", "resume"]),
  language: z.enum(["english", "urdu", "roman-urdu"]).default("english"),
  prompt: z.string().trim().min(3, "Please enter a prompt.").max(12000, "Prompt is too long."),
  context: z.string().trim().max(28000, "Context is too long.").optional(),
  modelPreference: z.enum(["auto", "general", "computer", "deep"]).default("auto"),
  options: z.record(z.unknown()).optional(),
});

type OpenRouterPayload = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  } | string;
};

function getMaxTokens(task: z.infer<typeof aiRequestSchema>["task"], options?: Record<string, unknown>) {
  if (options?.mode === "book-assistant" || options?.mode === "earth-map-explorer") return 750;
  if (task === "summary" || task === "grammar") return 900;
  if (task === "past-paper" || task === "resume" || task === "counseling") return 1200;
  return 850;
}

type AiErrorCode =
  | "OPENROUTER_API_KEY_MISSING"
  | "OPENROUTER_API_KEY_INVALID"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "OPENROUTER_BAD_REQUEST"
  | "OPENROUTER_AUTH_ERROR"
  | "OPENROUTER_PAYMENT_REQUIRED"
  | "OPENROUTER_RATE_LIMITED"
  | "OPENROUTER_MODEL_UNAVAILABLE"
  | "OPENROUTER_SERVER_ERROR"
  | "OPENROUTER_NETWORK_ERROR"
  | "OPENROUTER_EMPTY_RESPONSE"
  | "AI_SERVER_ERROR";

type ApiErrorBody = {
  error: {
    code: AiErrorCode;
    message: string;
    detail?: string;
  };
};

function createApiError(code: AiErrorCode, message: string, status: number, detail?: string) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(detail ? { detail } : {}),
    },
  };

  return NextResponse.json(body, { status });
}

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).trim();
  }

  const inlineCommentIndex = trimmed.search(/\s#/);
  return inlineCommentIndex >= 0 ? trimmed.slice(0, inlineCommentIndex).trim() : trimmed;
}

function readOpenRouterKeyFromLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return undefined;
  }

  try {
    const envFile = readFileSync(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const normalizedLine = line.trim().replace(/^export\s+/, "");

      if (!normalizedLine || normalizedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = normalizedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const name = normalizedLine.slice(0, separatorIndex).trim();

      if (name !== "OPENROUTER_API_KEY") {
        continue;
      }

      return normalizeEnvValue(normalizedLine.slice(separatorIndex + 1));
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isMissingOrPlaceholderApiKey(apiKey: string | undefined) {
  if (!apiKey) return true;

  return /^(your_|replace_|paste_|sk-or-v1-?x+$|<.*>)$/i.test(apiKey);
}

function getOpenRouterApiKey() {
  const apiKey = normalizeEnvValue(process.env.OPENROUTER_API_KEY || "") || readOpenRouterKeyFromLocalEnv();

  if (!isMissingOrPlaceholderApiKey(apiKey)) {
    return apiKey;
  }

  const target = process.env.VERCEL
    ? "Vercel Project Settings > Environment Variables"
    : ".env or .env.local";

  return createApiError(
    "OPENROUTER_API_KEY_MISSING",
    `OPENROUTER_API_KEY is missing for this runtime. Add it in ${target}, then restart/redeploy the app.`,
    500,
  );
}

function parseOpenRouterError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } | string }).error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
  }

  return fallback;
}

function mapOpenRouterError(status: number, message: string, models: string[]) {
  const modelList = models.join(", ");

  if (status === 400) {
    return {
      code: "OPENROUTER_BAD_REQUEST" as const,
      message: `OpenRouter rejected the request: ${message}`,
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "OPENROUTER_AUTH_ERROR" as const,
      message: "OpenRouter rejected the API key. Check OPENROUTER_API_KEY; it may be missing, invalid, or not enabled in this deployment.",
    };
  }

  if (status === 402) {
    return {
      code: "OPENROUTER_PAYMENT_REQUIRED" as const,
      message: "OpenRouter account has no available credits for this request.",
    };
  }

  if (status === 404) {
    return {
      code: "OPENROUTER_MODEL_UNAVAILABLE" as const,
      message: `OpenRouter could not use any selected model: ${modelList}.`,
    };
  }

  if (status === 429) {
    return {
      code: "OPENROUTER_RATE_LIMITED" as const,
      message: `OpenRouter rate limit was reached after trying the fallback models. Tried: ${modelList}.`,
    };
  }

  if (status >= 500) {
    return {
      code: "OPENROUTER_SERVER_ERROR" as const,
      message: `OpenRouter is temporarily unavailable: ${message}`,
    };
  }

  return {
    code: "OPENROUTER_SERVER_ERROR" as const,
    message: `OpenRouter request failed (${status}): ${message}`,
  };
}

export async function POST(request: NextRequest) {
  const apiKeyOrResponse = getOpenRouterApiKey();

  if (typeof apiKeyOrResponse !== "string") {
    return apiKeyOrResponse;
  }

  try {
    const json = await request.json();
    const parsed = aiRequestSchema.safeParse(json);

    if (!parsed.success) {
      return createApiError(
        "INVALID_REQUEST",
        parsed.error.issues[0]?.message || "Invalid AI request.",
        400,
        parsed.error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; "),
      );
    }

    const { task, language, prompt, context, modelPreference, options } = parsed.data;
    const modelSelection = selectOpenRouterModel({
      modelPreference,
      task,
      text: `${prompt}\n${context || ""}`,
    });

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(32_000),
      headers: {
        Authorization: `Bearer ${apiKeyOrResponse}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-OpenRouter-Title": process.env.OPENROUTER_SITE_NAME || "Study Buddy AI",
      },
      body: JSON.stringify({
        models: modelSelection.models,
        messages: buildOpenRouterMessages({ task, language, prompt, context, options }),
        provider: {
          allow_fallbacks: true,
        },
        temperature: 0.25,
        top_p: 0.9,
        max_tokens: getMaxTokens(task, options),
      }),
    });

    const rawText = await openRouterResponse.text();
    let payload: OpenRouterPayload | null = null;

    try {
      payload = rawText ? JSON.parse(rawText) as OpenRouterPayload : null;
    } catch {
      payload = null;
    }

    if (!openRouterResponse.ok) {
      const detail = parseOpenRouterError(payload, rawText || "OpenRouter request failed.");
      const mappedError = mapOpenRouterError(openRouterResponse.status, detail, modelSelection.models);

      return createApiError(
        mappedError.code,
        mappedError.message,
        openRouterResponse.status,
        detail,
      );
    }

    const content = payload?.choices?.[0]?.message?.content;
    const resolvedModel = payload?.model || modelSelection.model;

    if (!content) {
      return createApiError("OPENROUTER_EMPTY_RESPONSE", "OpenRouter returned an empty response.", 502);
    }

    return NextResponse.json({
      content,
      model: resolvedModel,
      modelKey: modelSelection.key,
      modelReason: modelSelection.reason,
      fallbackModels: modelSelection.models,
      modelFallbackUsed: resolvedModel !== modelSelection.model,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createApiError("INVALID_JSON", "Invalid request JSON.", 400);
    }

    if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return createApiError(
        "OPENROUTER_NETWORK_ERROR",
        "AI request timed out after 32 seconds. Try a shorter prompt or retry in a moment.",
        504,
        error.message,
      );
    }

    if (error instanceof TypeError) {
      return createApiError(
        "OPENROUTER_NETWORK_ERROR",
        "Could not reach OpenRouter. Check the network connection and try again.",
        502,
        error.message,
      );
    }

    const detail = error instanceof Error ? error.message : undefined;
    return createApiError("AI_SERVER_ERROR", "Unexpected AI server error.", 500, detail);
  }
}
