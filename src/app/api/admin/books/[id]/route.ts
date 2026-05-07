import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { BookDocument, ensureBookIndexes, sanitizeBookPayload, serializeAdminBook } from "@/lib/server/books";
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: { code: "INVALID_BOOK_ID", message: "Invalid book id." } }, { status: 400 });
    }

    const payload = sanitizeBookPayload(await request.json());
    await ensureIndexes();
    await ensureBookIndexes();
    const db = await getDb();
    const _id = new ObjectId(params.id);
    await db.collection<BookDocument>("books").updateOne(
      { _id },
      {
        $set: {
          ...payload,
          updatedAt: new Date(),
        },
      },
    );

    const book = await db.collection<BookDocument>("books").findOne({ _id });
    return NextResponse.json({ book: book ? serializeAdminBook(book) : null });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_BOOK_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Could not update book.",
        },
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: { code: "INVALID_BOOK_ID", message: "Invalid book id." } }, { status: 400 });
    }

    await ensureIndexes();
    await ensureBookIndexes();
    const db = await getDb();
    await db.collection<BookDocument>("books").deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_BOOK_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Could not delete book.",
        },
      },
      { status: 400 },
    );
  }
}
