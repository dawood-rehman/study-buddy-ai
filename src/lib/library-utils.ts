export type LibraryItemType = "book" | "summary" | "quiz" | "study" | "grammar" | "counseling" | "resume" | "past-paper" | "general-ai";

export function folderForItem(type: LibraryItemType, title: string) {
  const cleanTitle = title.trim() || "Untitled";

  if (type === "summary") return `Summary - ${cleanTitle}`;
  if (type === "book") return "Saved Books";
  if (type === "resume") return "Resume Builder";
  if (type === "counseling") return "Counseling Plans";
  if (type === "general-ai") return "General AI Answers";
  if (type === "past-paper") return "Past Paper Solutions";
  if (type === "grammar") return "Grammar Coach";
  if (type === "quiz") return "Generated Quizzes";

  return "Study Helper";
}
