import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { hashPassword, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(24, "Reset token is invalid."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
});

type ResetTokenDocument = {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
};

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const parsed = resetPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_RESET_PASSWORD", message: parsed.error.issues[0]?.message || "Invalid reset request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const now = new Date();
    const tokenHash = hashResetToken(parsed.data.token);
    const tokenDocument = await db.collection<ResetTokenDocument>("passwordResetTokens").findOne({
      tokenHash,
      expiresAt: { $gt: now },
      $or: [{ usedAt: null }, { usedAt: { $exists: false } }],
    });

    if (!tokenDocument) {
      return NextResponse.json(
        { error: { code: "RESET_TOKEN_INVALID", message: "This reset link is invalid or has expired. Please request a new one." } },
        { status: 400 },
      );
    }

    const user = await db.collection<UserDocument>("users").findOne({ _id: tokenDocument.userId });

    if (!user) {
      return NextResponse.json(
        { error: { code: "RESET_USER_NOT_FOUND", message: "Account was not found. Please request a new reset link." } },
        { status: 404 },
      );
    }

    const passwordFields = await hashPassword(parsed.data.password);

    await db.collection<UserDocument>("users").updateOne(
      { _id: user._id },
      {
        $set: {
          ...passwordFields,
          updatedAt: now,
          passwordResetAt: now,
        },
      },
    );

    await db.collection<ResetTokenDocument>("passwordResetTokens").updateOne(
      { _id: tokenDocument._id },
      { $set: { usedAt: now } },
    );

    await db.collection("sessions").deleteMany({ userId: user._id });

    return NextResponse.json({ ok: true, message: "Password reset successfully. You can now login with your new password." });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "RESET_PASSWORD_FAILED",
          message: error instanceof Error ? error.message : "Password reset failed.",
        },
      },
      { status: 500 },
    );
  }
}
