import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionResponse, normalizedUserEmail, verifyPassword, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_LOGIN", message: parsed.error.issues[0]?.message || "Invalid login request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const user = await db.collection<UserDocument>("users").findOne({ email: normalizedUserEmail(parsed.data.email) });

    if (!user || !await verifyPassword(parsed.data.password, user.salt, user.passwordHash)) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } },
        { status: 401 },
      );
    }

    return createSessionResponse(user);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "LOGIN_FAILED",
          message: error instanceof Error ? error.message : "Login failed.",
        },
      },
      { status: 500 },
    );
  }
}
