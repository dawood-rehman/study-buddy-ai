import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { normalizedUserEmail, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const RESET_TOKEN_MINUTES = 45;
const MAX_RESET_REQUESTS_PER_HOUR = 5;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getResetBaseUrl(request: NextRequest) {
  return process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.PASSWORD_RESET_FROM || "Study Buddy AI <onboarding@resend.dev>",
      to,
      subject: "Reset your Study Buddy AI password",
      html: [
        "<h2>Reset your password</h2>",
        `<p>Use this secure link to reset your Study Buddy AI password. It expires in ${RESET_TOKEN_MINUTES} minutes.</p>`,
        `<p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#1f8f7e;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p>`,
        "<p>If you did not request this, you can ignore this email.</p>",
      ].join(""),
      text: [
        "Reset your Study Buddy AI password",
        `This link expires in ${RESET_TOKEN_MINUTES} minutes:`,
        resetUrl,
        "If you did not request this, ignore this email.",
      ].join("\n\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Password reset email could not be sent.");
  }

  return { sent: true };
}

export async function POST(request: NextRequest) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_FORGOT_PASSWORD", message: parsed.error.issues[0]?.message || "Invalid password reset request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const email = normalizedUserEmail(parsed.data.email);
    const genericResponse: Record<string, unknown> = {
      ok: true,
      message: "If an account exists for this email, a secure reset link has been sent.",
    };
    const user = await db.collection<UserDocument>("users").findOne({ email });

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await db.collection("passwordResetTokens").countDocuments({
      email,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentRequests >= MAX_RESET_REQUESTS_PER_HOUR) {
      return NextResponse.json(genericResponse);
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESET_TOKEN_MINUTES * 60 * 1000);
    const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(token)}`, getResetBaseUrl(request)).toString();

    await db.collection("passwordResetTokens").insertOne({
      userId: user._id,
      email,
      tokenHash,
      createdAt: now,
      expiresAt,
      usedAt: null,
    });

    try {
      const emailResult = await sendPasswordResetEmail({ to: email, resetUrl });

      if (!emailResult.sent && process.env.NODE_ENV !== "production") {
        genericResponse.debugResetUrl = resetUrl;
        genericResponse.emailConfigured = false;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        genericResponse.debugResetUrl = resetUrl;
        genericResponse.emailConfigured = false;
        genericResponse.emailError = error instanceof Error ? error.message : "Email sending failed.";
      }
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "FORGOT_PASSWORD_FAILED",
          message: error instanceof Error ? error.message : "Password reset request failed.",
        },
      },
      { status: 500 },
    );
  }
}
