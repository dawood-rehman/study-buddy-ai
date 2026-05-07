import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument, normalizedUserEmail, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80, "Name is too long.").optional(),
  email: z.string().trim().email("Enter a valid email address.").optional(),
  aiQuotaLimit: z.coerce.number().int().min(0, "Quota cannot be negative.").max(100000, "Quota is too high.").optional(),
  aiDisabled: z.boolean().optional(),
  subscription: z.string().trim().max(40, "Subscription label is too long.").optional(),
  permissions: z.array(z.string().trim().max(40)).max(30).optional(),
});

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

function getUserId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const userId = getUserId(params.id);

    if (!userId) {
      return NextResponse.json({ error: { code: "INVALID_USER_ID", message: "Invalid user id." } }, { status: 400 });
    }

    const parsed = updateUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_USER_UPDATE", message: parsed.error.issues[0]?.message || "Invalid user update." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.email !== undefined) {
      const email = normalizedUserEmail(parsed.data.email);
      const duplicate = await db.collection<UserDocument>("users").findOne({
        email,
        _id: { $ne: userId },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: { code: "EMAIL_ALREADY_EXISTS", message: "Another account already uses this email." } },
          { status: 409 },
        );
      }

      patch.email = email;
    }
    if (parsed.data.aiQuotaLimit !== undefined) patch.aiQuotaLimit = parsed.data.aiQuotaLimit;
    if (parsed.data.aiDisabled !== undefined) patch.aiDisabled = parsed.data.aiDisabled;
    if (parsed.data.subscription !== undefined) patch.subscription = parsed.data.subscription || "free";
    if (parsed.data.permissions !== undefined) patch.permissions = parsed.data.permissions;

    await db.collection<UserDocument>("users").updateOne({ _id: userId }, { $set: patch });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_USER_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Could not update user.",
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const userId = getUserId(params.id);

    if (!userId) {
      return NextResponse.json({ error: { code: "INVALID_USER_ID", message: "Invalid user id." } }, { status: 400 });
    }

    if (auth.user._id.equals(userId)) {
      return NextResponse.json(
        { error: { code: "CANNOT_DELETE_SELF", message: "You cannot delete your own admin account from this panel." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    await Promise.all([
      db.collection("users").deleteOne({ _id: userId }),
      db.collection("sessions").deleteMany({ userId }),
      db.collection("settings").deleteMany({ userId }),
      db.collection("libraryItems").deleteMany({ userId }),
      db.collection("passwordResetTokens").deleteMany({ userId }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_USER_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Could not delete user.",
        },
      },
      { status: 500 },
    );
  }
}
