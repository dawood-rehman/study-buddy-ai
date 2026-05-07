import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: { code: "INVALID_LIBRARY_ID", message: "Invalid library item id." } }, { status: 400 });
    }

    await ensureIndexes();
    const db = await getDb();
    await db.collection("libraryItems").deleteOne({
      _id: new ObjectId(params.id),
      userId: user._id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "LIBRARY_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Could not delete library item.",
        },
      },
      { status: 500 },
    );
  }
}
