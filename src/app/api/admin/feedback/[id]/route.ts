import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const updateSchema = z.object({
  status: z.enum(["open", "in-review", "resolved"]).optional(),
  adminReply: z.string().trim().max(8000, "Reply is too long.").optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: { code: "INVALID_FEEDBACK_ID", message: "Invalid feedback id." } }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_ADMIN_UPDATE", message: parsed.error.issues[0]?.message || "Invalid admin update." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const now = new Date();
    const update = {
      ...parsed.data,
      updatedAt: now,
      ...(parsed.data.status === "resolved" ? { resolvedAt: now } : {}),
    };

    await db.collection("feedback").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: update },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_FEEDBACK_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Could not update feedback.",
        },
      },
      { status: 500 },
    );
  }
}
