import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { buildOpenRouterMessages, selectOpenRouterModel } from "@/lib/openrouter";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";
import { getSubscriptionProfile, type SubscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";

const aiRequestSchema = z.object({
  task: z.enum(["study", "quiz", "summary", "past-paper", "grammar", "counseling", "resume"]),
  language: z.enum(["english", "urdu", "roman-urdu"]).default("english"),
  prompt: z.string().trim().min(3, "Please enter a prompt.").max(12000, "Prompt is too long."),
  context: z.string().trim().max(28000, "Context is too long.").optional(),
  modelPreference: z.enum(["auto", "general", "computer", "deep"]).default("auto"),
  options: z.record(z.unknown()).optional(),
});

type ParsedAiRequest = z.infer<typeof aiRequestSchema>;

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
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type AiUsageDocument = {
  userId?: ObjectId;
  email?: string;
  task: ParsedAiRequest["task"];
  language: ParsedAiRequest["language"];
  modelKey: string;
  requestedModels: string[];
  resolvedModel?: string;
  status: "success" | "failed" | "quota-blocked" | "disabled";
  subscriptionPlan?: SubscriptionPlan | "admin";
  durationMs: number;
  promptChars: number;
  contextChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  reportedTotalTokens?: number;
  errorCode?: string;
  errorDetail?: string;
  createdAt: Date;
};

const ATTEMPT_TIMEOUT_MS = 24_000;
const FALLBACK_STAGGER_MS = 2_500;
const FREE_COOLDOWN_MS = 5 * 60 * 60 * 1000;

function getMaxTokens(task: ParsedAiRequest["task"], options?: Record<string, unknown>) {
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
  | "AI_ACCESS_DISABLED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_COOLDOWN_ACTIVE"
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
    upgrade?: {
      reason: string;
      cooldownUntil?: string;
      plan?: string;
    };
  };
};

type OpenRouterAttempt = {
  model: string;
  resolvedModel?: string;
  content: string;
  payload: OpenRouterPayload | null;
  durationMs: number;
  index: number;
};

class OpenRouterAttemptError extends Error {
  code: AiErrorCode;
  status: number;
  detail?: string;
  model: string;
  retryable: boolean;
  durationMs: number;

  constructor({
    code,
    message,
    status,
    detail,
    model,
    retryable,
    durationMs,
  }: {
    code: AiErrorCode;
    message: string;
    status: number;
    detail?: string;
    model: string;
    retryable: boolean;
    durationMs: number;
  }) {
    super(message);
    this.name = "OpenRouterAttemptError";
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.model = model;
    this.retryable = retryable;
    this.durationMs = durationMs;
  }
}

function createApiError(
  code: AiErrorCode,
  message: string,
  status: number,
  detail?: string,
  upgrade?: ApiErrorBody["error"]["upgrade"],
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(detail ? { detail } : {}),
      ...(upgrade ? { upgrade } : {}),
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
      retryable: false,
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "OPENROUTER_AUTH_ERROR" as const,
      message: "OpenRouter rejected the API key. Check OPENROUTER_API_KEY; it may be missing, invalid, or not enabled in this deployment.",
      retryable: false,
    };
  }

  if (status === 402) {
    return {
      code: "OPENROUTER_PAYMENT_REQUIRED" as const,
      message: "OpenRouter account has no available credits for this request.",
      retryable: false,
    };
  }

  if (status === 404) {
    return {
      code: "OPENROUTER_MODEL_UNAVAILABLE" as const,
      message: `OpenRouter could not use the selected fallback models: ${modelList}.`,
      retryable: true,
    };
  }

  if (status === 429) {
    return {
      code: "OPENROUTER_RATE_LIMITED" as const,
      message: `OpenRouter rate limit was reached after trying fallback models. Tried: ${modelList}.`,
      retryable: true,
    };
  }

  if (status >= 500) {
    return {
      code: "OPENROUTER_SERVER_ERROR" as const,
      message: `OpenRouter is temporarily unavailable: ${message}`,
      retryable: true,
    };
  }

  return {
    code: "OPENROUTER_SERVER_ERROR" as const,
    message: `OpenRouter request failed (${status}): ${message}`,
    retryable: true,
  };
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function getMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function getDayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getHourStart() {
  return new Date(Date.now() - 60 * 60 * 1000);
}

async function logAiUsage(document: AiUsageDocument) {
  try {
    await ensureIndexes();
    const db = await getDb();
    await db.collection<AiUsageDocument>("aiUsage").insertOne(document);
  } catch {
    // Usage logs must not block the user-facing AI response.
  }
}

async function getCurrentUserForAi(request: NextRequest) {
  try {
    return await getAuthenticatedUserDocument(request);
  } catch {
    return null;
  }
}

function getUserSubscriptionProfile(user: UserDocument | null) {
  const role = isAdminEmail(user?.email) ? "admin" : "user";

  return getSubscriptionProfile({
    role,
    subscriptionPlan: user?.subscriptionPlan,
    subscription: user?.subscription,
    subscriptionStatus: user?.subscriptionStatus,
    subscriptionExpiresAt: user?.subscriptionExpiresAt,
  });
}

async function enforceAiQuota(user: UserDocument | null) {
  if (!user) return null;
  const profile = getUserSubscriptionProfile(user);

  if (profile.isAdmin) return null;

  if (user.aiDisabled === true) {
    return createApiError("AI_ACCESS_DISABLED", "AI access is disabled for this account. Contact the admin.", 403);
  }

  const cooldownUntil = user.aiCooldownUntil instanceof Date ? user.aiCooldownUntil : null;
  if (profile.plan === "free" && cooldownUntil && cooldownUntil.getTime() > Date.now()) {
    return createApiError(
      "AI_COOLDOWN_ACTIVE",
      "Free AI quota is exhausted. Upgrade to Standard or Advanced to continue immediately.",
      429,
      `Cooldown ends at ${cooldownUntil.toISOString()}.`,
      {
        reason: "free-cooldown",
        cooldownUntil: cooldownUntil.toISOString(),
        plan: profile.plan,
      },
    );
  }

  try {
    await ensureIndexes();
    const db = await getDb();
    const monthlyLimitOverride = typeof user.aiQuotaLimit === "number" ? user.aiQuotaLimit : undefined;
    const monthlyLimit = monthlyLimitOverride ?? profile.ai.monthlyLimit;
    const [usedThisHour, usedToday, usedThisMonth] = await Promise.all([
      db.collection("aiUsage").countDocuments({
        userId: user._id,
        status: "success",
        createdAt: { $gte: getHourStart() },
      }),
      db.collection("aiUsage").countDocuments({
        userId: user._id,
        status: "success",
        createdAt: { $gte: getDayStart() },
      }),
      db.collection("aiUsage").countDocuments({
        userId: user._id,
        status: "success",
        createdAt: { $gte: getMonthStart() },
      }),
    ]);

    const hourlyExceeded = usedThisHour >= profile.ai.hourlyLimit;
    const dailyExceeded = usedToday >= profile.ai.dailyLimit;
    const monthlyExceeded = usedThisMonth >= monthlyLimit;

    if (hourlyExceeded || dailyExceeded || monthlyExceeded) {
      const cooldownDate = profile.plan === "free" ? new Date(Date.now() + FREE_COOLDOWN_MS) : null;

      if (cooldownDate) {
        await db.collection<UserDocument>("users").updateOne(
          { _id: user._id },
          { $set: { aiCooldownUntil: cooldownDate, updatedAt: new Date() } },
        );
      }

      const quotaMessage = monthlyExceeded
        ? `Monthly AI quota reached (${usedThisMonth}/${monthlyLimit}).`
        : dailyExceeded
          ? `Daily AI quota reached (${usedToday}/${profile.ai.dailyLimit}).`
          : `Hourly AI quota reached (${usedThisHour}/${profile.ai.hourlyLimit}).`;

      return createApiError(
        profile.plan === "free" ? "AI_COOLDOWN_ACTIVE" : "AI_QUOTA_EXCEEDED",
        profile.plan === "free"
          ? `${quotaMessage} Free users are paused for 5 hours. Upgrade to continue immediately.`
          : `${quotaMessage} Upgrade or ask admin to increase your limit.`,
        429,
        cooldownDate ? `Cooldown ends at ${cooldownDate.toISOString()}.` : undefined,
        {
          reason: profile.plan === "free" ? "free-quota-cooldown" : "quota-exceeded",
          cooldownUntil: cooldownDate?.toISOString(),
          plan: profile.plan,
        },
      );
    }
  } catch {
    return null;
  }

  return null;
}

function getFallbackStaggerMs(user: UserDocument | null) {
  const profile = getUserSubscriptionProfile(user);

  if (profile.ai.priority === "unlimited" || profile.ai.priority === "high") return 1_000;
  if (profile.ai.priority === "standard") return 1_800;
  return FALLBACK_STAGGER_MS;
}

function getSubscriptionPlanForLog(user: UserDocument | null) {
  const profile = getUserSubscriptionProfile(user);
  return profile.isAdmin ? "admin" : profile.plan;
}

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-OpenRouter-Title": process.env.OPENROUTER_SITE_NAME || "Study Buddy AI",
  };
}

async function callOpenRouterModel({
  apiKey,
  requestBody,
  model,
  models,
  index,
  controller,
}: {
  apiKey: string;
  requestBody: Omit<Record<string, unknown>, "model">;
  model: string;
  models: string[];
  index: number;
  controller: AbortController;
}): Promise<OpenRouterAttempt> {
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        ...requestBody,
        model,
        provider: {
          allow_fallbacks: true,
        },
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
      const mappedError = mapOpenRouterError(openRouterResponse.status, detail, models);

      throw new OpenRouterAttemptError({
        code: mappedError.code,
        message: mappedError.message,
        status: openRouterResponse.status,
        detail,
        model,
        retryable: mappedError.retryable,
        durationMs: Date.now() - startedAt,
      });
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      throw new OpenRouterAttemptError({
        code: "OPENROUTER_EMPTY_RESPONSE",
        message: "OpenRouter returned an empty response.",
        status: 502,
        model,
        retryable: true,
        durationMs: Date.now() - startedAt,
      });
    }

    return {
      model,
      resolvedModel: payload?.model || model,
      content,
      payload,
      durationMs: Date.now() - startedAt,
      index,
    };
  } catch (error) {
    if (error instanceof OpenRouterAttemptError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new OpenRouterAttemptError({
        code: "OPENROUTER_NETWORK_ERROR",
        message: `${model} timed out after ${Math.round(ATTEMPT_TIMEOUT_MS / 1000)} seconds.`,
        status: 504,
        detail: error instanceof Error ? error.message : undefined,
        model,
        retryable: true,
        durationMs: Date.now() - startedAt,
      });
    }

    throw new OpenRouterAttemptError({
      code: "OPENROUTER_NETWORK_ERROR",
      message: "Could not reach OpenRouter. Check the network connection and try again.",
      status: 502,
      detail: error instanceof Error ? error.message : undefined,
      model,
      retryable: true,
      durationMs: Date.now() - startedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runFallbackModels({
  apiKey,
  requestBody,
  models,
  staggerMs,
}: {
  apiKey: string;
  requestBody: Omit<Record<string, unknown>, "model">;
  models: string[];
  staggerMs: number;
}) {
  const controllers = models.map(() => new AbortController());
  const failures: OpenRouterAttemptError[] = [];

  return await new Promise<OpenRouterAttempt>((resolveAttempt, rejectAttempt) => {
    let settled = false;
    let completed = 0;

    const finishWithFailureIfDone = () => {
      if (settled || completed < models.length) return;
      const firstAuthOrBadRequest = failures.find((failure) => !failure.retryable);
      rejectAttempt(firstAuthOrBadRequest || failures[0] || new Error("OpenRouter fallback failed."));
    };

    models.forEach((model, index) => {
      const start = () => {
        if (settled) return;

        callOpenRouterModel({
          apiKey,
          requestBody,
          model,
          models,
          index,
          controller: controllers[index],
        }).then((result) => {
          if (settled) return;
          settled = true;
          controllers.forEach((controller, controllerIndex) => {
            if (controllerIndex !== index) controller.abort();
          });
          resolveAttempt(result);
        }).catch((error: OpenRouterAttemptError) => {
          if (settled) return;
          failures.push(error);
          completed += 1;

          if (!error.retryable) {
            settled = true;
            controllers.forEach((controller) => controller.abort());
            rejectAttempt(error);
            return;
          }

          finishWithFailureIfDone();
        });
      };

      if (index === 0) {
        start();
        return;
      }

      setTimeout(start, staggerMs * index);
    });
  });
}

export async function POST(request: NextRequest) {
  const apiKeyOrResponse = getOpenRouterApiKey();

  if (typeof apiKeyOrResponse !== "string") {
    return apiKeyOrResponse;
  }

  const startedAt = Date.now();
  let parsedRequest: ParsedAiRequest | null = null;
  let currentUser: UserDocument | null = null;

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

    parsedRequest = parsed.data;
    currentUser = await getCurrentUserForAi(request);
    const quotaResponse = await enforceAiQuota(currentUser);

    if (quotaResponse) {
      await logAiUsage({
        userId: currentUser?._id,
        email: currentUser?.email,
        task: parsedRequest.task,
        language: parsedRequest.language,
        modelKey: parsedRequest.modelPreference,
        requestedModels: [],
        status: quotaResponse.status === 403 ? "disabled" : "quota-blocked",
        subscriptionPlan: getSubscriptionPlanForLog(currentUser),
        durationMs: Date.now() - startedAt,
        promptChars: parsedRequest.prompt.length,
        contextChars: parsedRequest.context?.length || 0,
        estimatedInputTokens: estimateTokens(`${parsedRequest.prompt}\n${parsedRequest.context || ""}`),
        estimatedOutputTokens: 0,
        errorCode: quotaResponse.status === 403 ? "AI_ACCESS_DISABLED" : "AI_QUOTA_EXCEEDED",
        createdAt: new Date(),
      });
      return quotaResponse;
    }

    const { task, language, prompt, context, modelPreference, options } = parsedRequest;
    const modelSelection = selectOpenRouterModel({
      modelPreference,
      task,
      text: `${prompt}\n${context || ""}`,
    });

    const messages = buildOpenRouterMessages({ task, language, prompt, context, options });
    const requestBody = {
      messages,
      temperature: 0.25,
      top_p: 0.9,
      max_tokens: getMaxTokens(task, options),
    };

    const attempt = await runFallbackModels({
      apiKey: apiKeyOrResponse,
      requestBody,
      models: modelSelection.models,
      staggerMs: getFallbackStaggerMs(currentUser),
    });

    await logAiUsage({
      userId: currentUser?._id,
      email: currentUser?.email,
      task,
      language,
      modelKey: modelSelection.key,
      requestedModels: modelSelection.models,
      resolvedModel: attempt.resolvedModel,
      status: "success",
      subscriptionPlan: getSubscriptionPlanForLog(currentUser),
      durationMs: Date.now() - startedAt,
      promptChars: prompt.length,
      contextChars: context?.length || 0,
      estimatedInputTokens: estimateTokens(`${prompt}\n${context || ""}`),
      estimatedOutputTokens: estimateTokens(attempt.content),
      reportedTotalTokens: attempt.payload?.usage?.total_tokens,
      createdAt: new Date(),
    });

    return NextResponse.json({
      content: attempt.content,
      model: attempt.resolvedModel || attempt.model,
      modelKey: modelSelection.key,
      modelReason: modelSelection.reason,
      fallbackModels: modelSelection.models,
      modelFallbackUsed: attempt.index > 0 || attempt.resolvedModel !== modelSelection.model,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createApiError("INVALID_JSON", "Invalid request JSON.", 400);
    }

    if (parsedRequest) {
      const attemptError = error instanceof OpenRouterAttemptError ? error : null;
      await logAiUsage({
        userId: currentUser?._id,
        email: currentUser?.email,
        task: parsedRequest.task,
        language: parsedRequest.language,
        modelKey: parsedRequest.modelPreference,
        requestedModels: [],
        status: "failed",
        subscriptionPlan: getSubscriptionPlanForLog(currentUser),
        durationMs: Date.now() - startedAt,
        promptChars: parsedRequest.prompt.length,
        contextChars: parsedRequest.context?.length || 0,
        estimatedInputTokens: estimateTokens(`${parsedRequest.prompt}\n${parsedRequest.context || ""}`),
        estimatedOutputTokens: 0,
        errorCode: attemptError?.code || "AI_SERVER_ERROR",
        errorDetail: attemptError?.detail || (error instanceof Error ? error.message : undefined),
        createdAt: new Date(),
      });
    }

    if (error instanceof OpenRouterAttemptError) {
      const friendlyTimeout = error.status === 504
        ? "All fallback models were busy or timed out. Please retry; the system will automatically try the next available model."
        : error.message;

      return createApiError(error.code, friendlyTimeout, error.status, error.detail);
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
