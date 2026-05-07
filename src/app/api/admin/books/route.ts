import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { BookDocument, ensureBookIndexes, getCustomBooks, sanitizeBookPayload, serializeAdminBook } from "@/lib/server/books";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    await ensureIndexes();
    await ensureBookIndexes();
    const books = await getCustomBooks({ includeDrafts: true, limit: 500 });
    return NextResponse.json({ books });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_BOOKS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load admin books.",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = sanitizeBookPayload(await request.json());
    await ensureIndexes();
    await ensureBookIndexes();
    const db = await getDb();
    const now = new Date();
    const result = await db.collection<BookDocument>("books").insertOne({
      ...payload,
      addedBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    } as BookDocument);

    const book = await db.collection<BookDocument>("books").findOne({ _id: result.insertedId });
    return NextResponse.json({ book: book ? serializeAdminBook(book) : null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_BOOK_CREATE_FAILED",
          message: error instanceof Error ? error.message : "Could not create book.",
        },
      },
      { status: 400 },
    );
  }
}
