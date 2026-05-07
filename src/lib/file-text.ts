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
];

export async function readTextFromFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const isReadable = file.type.startsWith("text/") || readableExtensions.some((ext) => lowerName.endsWith(ext));

  if (!isReadable) {
    throw new Error("File selected. For now, paste PDF/image text into the text box for AI analysis.");
  }

  const text = await file.text();

  if (!text.trim()) {
    throw new Error("The selected file does not contain readable text.");
  }

  return text;
}
