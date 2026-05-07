import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserDocument, hashPassword, toPublicUser, verifyPassword, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128, "New password is too long."),
  confirmPassword: z.string().optional(),
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

    if (parsed.data.confirmPassword !== undefined && parsed.data.confirmPassword !== parsed.data.newPassword) {
      return NextResponse.json(
        { error: { code: "PASSWORD_CONFIRMATION_MISMATCH", message: "New password and confirmation do not match." } },
        { status: 400 },
      );
    }

    const hasPassword = Boolean(user.passwordHash && user.salt);

    if (hasPassword && !parsed.data.currentPassword) {
      return NextResponse.json(
        { error: { code: "CURRENT_PASSWORD_REQUIRED", message: "Current password is required." } },
        { status: 400 },
      );
    }

    if (hasPassword && !await verifyPassword(parsed.data.currentPassword || "", user.salt, user.passwordHash)) {
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
      { $set: { ...passwordFields, authProvider: user.authProvider || "password", updatedAt: new Date() } },
    );
    const updatedUser = await db.collection<UserDocument>("users").findOne({ _id: user._id });

    return NextResponse.json({ ok: true, user: updatedUser ? toPublicUser(updatedUser) : toPublicUser(user) });
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
