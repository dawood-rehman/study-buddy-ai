const readableExtensions = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".html",
  ".css",
  ".xml",
  ".yaml",
  ".yml",
];

export async function readTextFromFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const isReadable = file.type.startsWith("text/") || readableExtensions.some((ext) => lowerName.endsWith(ext));

  if (!isReadable) {
    throw new Error("This file type needs document parsing. Upload is saved for the workflow; paste extracted text for AI analysis in this version.");
  }

  const text = await file.text();

  if (!text.trim()) {
    throw new Error("The selected file does not contain readable text.");
  }

  return text;
}
