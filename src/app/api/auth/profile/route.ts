import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getAuthenticatedUserDocument, normalizedUserEmail, toPublicUser, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address."),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    const parsed = profileSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_PROFILE", message: parsed.error.issues[0]?.message || "Invalid profile request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const email = normalizedUserEmail(parsed.data.email);
    const duplicate = await db.collection<UserDocument>("users").findOne({
      email,
      _id: { $ne: new ObjectId(user._id) },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "Another account already uses this email." } },
        { status: 409 },
      );
    }

    await db.collection<UserDocument>("users").updateOne(
      { _id: user._id },
      { $set: { name: parsed.data.name, email, updatedAt: new Date() } },
    );

    const updatedUser = await db.collection<UserDocument>("users").findOne({ _id: user._id });
    return NextResponse.json({ user: updatedUser ? toPublicUser(updatedUser) : toPublicUser(user) });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PROFILE_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Profile update failed.",
        },
      },
      { status: 500 },
    );
  }
}
