export const OPENROUTER_MODEL_FALLBACKS = {
  general: [
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "openai/gpt-oss-120b:free",
  ],
  computer: [
    "qwen/qwen3-coder:free",
    "openai/gpt-oss-20b:free",
    "baidu/cobuddy:free",
  ],
  deep: [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "openai/gpt-oss-120b:free",
    "z-ai/glm-4.5-air:free",
  ],
} as const;

const OPENROUTER_MAX_FALLBACK_MODELS = 2;

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
  study: "Answer the exact study request with clear headings, essential examples, and a short recap.",
  quiz: "Create or grade practice questions exactly as requested. Include compact answers or marks only when needed.",
  summary: "Create a focused study summary with headings, key points, and revision notes.",
  "past-paper": "Solve the paper step by step, but keep reasoning concise. State assumptions when a question is incomplete.",
  grammar: "Teach the requested grammar concept with examples, corrections, and a short practice exercise.",
  counseling: "Create a practical plan with priorities, routine, improvement strategy, and next steps.",
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
        "Follow the user's prompt and intent strictly.",
        "Do not add unrelated sections or unnecessary background.",
        "Prefer concise, high-signal answers that finish quickly.",
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
