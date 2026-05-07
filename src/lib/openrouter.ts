export const OPENROUTER_MODELS = {
  general: "openai/gpt-oss-120b:free",
  computer: "qwen/qwen3-coder:free",
  deep: "qwen/qwen3-next-80b-a3b-instruct:free",
} as const;

export type OpenRouterModelKey = keyof typeof OPENROUTER_MODELS;
export type ModelPreference = "auto" | OpenRouterModelKey;
export type AiTask = "study" | "quiz" | "summary" | "past-paper" | "grammar" | "counseling" | "resume";
export type AiLanguage = "english" | "urdu" | "roman-urdu";

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

export function selectOpenRouterModel({
  modelPreference,
  task,
  text,
}: {
  modelPreference: ModelPreference;
  task: AiTask;
  text: string;
}) {
  if (modelPreference !== "auto") {
    return {
      key: modelPreference,
      model: OPENROUTER_MODELS[modelPreference],
      reason: "manual",
    };
  }

  const searchable = text.toLowerCase();
  const isComputerTopic = computerSignals.some((signal) => searchable.includes(signal));

  if (isComputerTopic) {
    return {
      key: "computer" as const,
      model: OPENROUTER_MODELS.computer,
      reason: "computer-topic",
    };
  }

  if (task === "resume" || task === "past-paper") {
    return {
      key: "deep" as const,
      model: OPENROUTER_MODELS.deep,
      reason: "deep-work",
    };
  }

  return {
    key: "general" as const,
    model: OPENROUTER_MODELS.general,
    reason: "default",
  };
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
