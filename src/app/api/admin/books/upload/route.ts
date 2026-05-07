import { NextRequest, NextResponse } from "next/server";
import { Binary } from "mongodb";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const maxUploadBytes = 18 * 1024 * 1024;
const allowedTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/epub+zip",
]);

async function requireAdmin(request: NextRequest) {
  const user = await getAuthenticatedUserDocument(request);

  if (!user) {
    return { error: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 }) };
  }

  if (!isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 }) };
  }

  return { user };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: { code: "FILE_REQUIRED", message: "Upload a PDF, TXT, or EPUB file." } }, { status: 400 });
    }

    if (file.size > maxUploadBytes) {
      return NextResponse.json({ error: { code: "FILE_TOO_LARGE", message: "File is too large. Upload files up to 18MB." } }, { status: 413 });
    }

    const lowerName = file.name.toLowerCase();
    const contentType = file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : lowerName.endsWith(".txt") ? "text/plain" : lowerName.endsWith(".epub") ? "application/epub+zip" : "");

    if (!allowedTypes.has(contentType)) {
      return NextResponse.json({ error: { code: "FILE_TYPE_UNSUPPORTED", message: "Only PDF, TXT, and EPUB uploads are supported." } }, { status: 400 });
    }

    await ensureIndexes();
    const db = await getDb();
    const bytes = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const result = await db.collection("bookFiles").insertOne({
      fileName: file.name,
      contentType,
      size: file.size,
      data: new Binary(bytes),
      uploadedBy: auth.user._id,
      createdAt: now,
    });

    return NextResponse.json({
      file: {
        id: result.insertedId.toString(),
        fileName: file.name,
        contentType,
        size: file.size,
        url: `/api/books/files/${result.insertedId.toString()}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "BOOK_FILE_UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not upload file.",
        },
      },
      { status: 500 },
    );
  }
}
