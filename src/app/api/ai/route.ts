import { NextRequest, NextResponse } from "next/server";
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
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  } | string;
};

function parseOpenRouterError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } | string }).error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key is missing. Add OPENROUTER_API_KEY in .env." },
      { status: 500 },
    );
  }

  try {
    const json = await request.json();
    const parsed = aiRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid AI request." },
        { status: 400 },
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-OpenRouter-Title": process.env.OPENROUTER_SITE_NAME || "Study Buddy AI",
      },
      body: JSON.stringify({
        model: modelSelection.model,
        messages: buildOpenRouterMessages({ task, language, prompt, context, options }),
        temperature: 0.35,
        max_tokens: 1400,
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
      return NextResponse.json(
        { error: parseOpenRouterError(payload, rawText || "OpenRouter request failed.") },
        { status: openRouterResponse.status },
      );
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "OpenRouter returned an empty response." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      content,
      model: modelSelection.model,
      modelKey: modelSelection.key,
      modelReason: modelSelection.reason,
    });
  } catch (error) {
    const message = error instanceof SyntaxError
      ? "Invalid request JSON."
      : "Unexpected AI server error. Please try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
