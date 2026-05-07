export const OPENROUTER_MODEL_FALLBACKS = {
  general: [
    "openai/gpt-oss-120b:free",
    "z-ai/glm-4.5-air:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "openai/gpt-oss-20b:free",
  ],
  computer: [
    "qwen/qwen3-coder:free",
    "baidu/cobuddy:free",
    "poolside/laguna-m.1:free",
    "poolside/laguna-xs.2:free",
    "openai/gpt-oss-120b:free",
  ],
  deep: [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "openrouter/owl-alpha",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "openai/gpt-oss-120b:free",
    "z-ai/glm-4.5-air:free",
  ],
} as const;

const OPENROUTER_MAX_FALLBACK_MODELS = 3;

export const OPENROUTER_MODELS = {
  general: OPENROUTER_MODEL_FALLBACKS.general[0],
  computer: OPENROUTER_MODEL_FALLBACKS.computer[0],
  deep: OPENROUTER_MODEL_FALLBACKS.deep[0],
} as const;

export type OpenRouterModelKey = keyof typeof OPENROUTER_MODEL_FALLBACKS;
export type ModelPreference = "auto" | OpenRouterModelKey;
export type AiTask = "study" | "quiz" | "summary" | "past-paper" | "grammar" | "counseling" | "resume";
export type AiLanguage = "english" | "urdu" | "roman-urdu";
export type OpenRouterModelSelection = {
  key: OpenRouterModelKey;
  model: string;
  models: string[];
  reason: "manual" | "computer-topic" | "deep-work" | "default";
};

const computerSignals = [
  "algorithm",
  "api",
  "binary",
  "code",
  "compiler",
  "computer",
  "css",
  "database",
  "debug",
  "html",
  "javascript",
  "next.js",
  "node",
  "programming",
  "python",
  "react",
  "software",
  "sql",
  "typescript",
];

const languageInstruction: Record<AiLanguage, string> = {
  english: "Reply in clear English.",
  urdu: "Reply in simple Urdu. Keep technical terms understandable.",
  "roman-urdu": "Reply in Roman Urdu using simple student-friendly wording.",
};

const taskInstruction: Record<AiTask, string> = {
  study: "Explain the topic like a patient tutor. Use examples, steps, and a short recap.",
  quiz: "Create practice questions with answers. Include difficulty tags and a compact answer key.",
  summary: "Create a clean study summary with headings, key points, and revision notes.",
  "past-paper": "Solve the paper step by step. State assumptions when a question is incomplete.",
  grammar: "Teach the grammar concept with examples, corrections, and a short practice exercise.",
  counseling: "Create a practical study plan with priorities, weekly routine, revision strategy, and exam tips.",
  resume: "Improve the resume content for ATS systems using concise, measurable, professional wording.",
};

function buildModelSelection(
  key: OpenRouterModelKey,
  reason: OpenRouterModelSelection["reason"],
): OpenRouterModelSelection {
  const models = Array.from(new Set(OPENROUTER_MODEL_FALLBACKS[key])).slice(0, OPENROUTER_MAX_FALLBACK_MODELS);

  return {
    key,
    model: models[0],
    models,
    reason,
  };
}

export function selectOpenRouterModel({
  modelPreference,
  task,
  text,
}: {
  modelPreference: ModelPreference;
  task: AiTask;
  text: string;
}): OpenRouterModelSelection {
  if (modelPreference !== "auto") {
    return buildModelSelection(modelPreference, "manual");
  }

  const searchable = text.toLowerCase();
  const isComputerTopic = computerSignals.some((signal) => searchable.includes(signal));

  if (isComputerTopic) {
    return buildModelSelection("computer", "computer-topic");
  }

  if (task === "resume" || task === "past-paper") {
    return buildModelSelection("deep", "deep-work");
  }

  return buildModelSelection("general", "default");
}

export function buildOpenRouterMessages({
  task,
  language,
  prompt,
  context,
  options,
}: {
  task: AiTask;
  language: AiLanguage;
  prompt: string;
  context?: string;
  options?: Record<string, unknown>;
}) {
  const optionText = options && Object.keys(options).length > 0
    ? `\nPreferences: ${JSON.stringify(options)}`
    : "";

  return [
    {
      role: "system" as const,
      content: [
        "You are Study Buddy AI, a careful educational assistant for students.",
        "Be accurate, structured, and honest when information is missing.",
        "Avoid unsafe shortcuts and do not invent sources or facts.",
        languageInstruction[language],
        taskInstruction[task],
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Task: ${task}`,
        optionText.trim(),
        context ? `Study material or user context:\n${context}` : "",
        `User request:\n${prompt}`,
      ].filter(Boolean).join("\n\n"),
    },
  ];
}
