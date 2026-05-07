import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionResponse, hashPassword, normalizedUserEmail, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = signupSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_SIGNUP", message: parsed.error.issues[0]?.message || "Invalid signup request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const now = new Date();
    const { name, password } = parsed.data;
    const email = normalizedUserEmail(parsed.data.email);
    const existing = await db.collection<UserDocument>("users").findOne({ email });

    if (existing) {
      return NextResponse.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists." } },
        { status: 409 },
      );
    }

    const passwordFields = await hashPassword(password);
    const result = await db.collection("users").insertOne({
      name,
      email,
      ...passwordFields,
      createdAt: now,
      updatedAt: now,
    });
    const user = await db.collection<UserDocument>("users").findOne({ _id: result.insertedId });

    if (!user) {
      return NextResponse.json(
        { error: { code: "USER_CREATE_FAILED", message: "Account was not created. Please try again." } },
        { status: 500 },
      );
    }

    await db.collection("settings").insertOne({
      userId: result.insertedId,
      defaultLanguage: "english",
      offlineMode: false,
      stepByStep: true,
      detail: "medium",
      updatedAt: now,
    });

    return createSessionResponse(user);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SIGNUP_FAILED",
          message: error instanceof Error ? error.message : "Signup failed.",
        },
      },
      { status: 500 },
    );
  }
}
