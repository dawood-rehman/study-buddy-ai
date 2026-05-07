import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserDocument, hashPassword, verifyPassword, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128, "New password is too long."),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    const parsed = passwordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_PASSWORD_CHANGE", message: parsed.error.issues[0]?.message || "Invalid password request." } },
        { status: 400 },
      );
    }

    if (!await verifyPassword(parsed.data.currentPassword, user.salt, user.passwordHash)) {
      return NextResponse.json(
        { error: { code: "INCORRECT_CURRENT_PASSWORD", message: "Current password is incorrect." } },
        { status: 401 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const passwordFields = await hashPassword(parsed.data.newPassword);
    await db.collection<UserDocument>("users").updateOne(
      { _id: user._id },
      { $set: { ...passwordFields, updatedAt: new Date() } },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PASSWORD_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Password update failed.",
        },
      },
      { status: 500 },
    );
  }
}
