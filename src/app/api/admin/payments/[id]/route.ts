import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const updatePaymentSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: { code: "INVALID_PAYMENT_ID", message: "Invalid payment id." } }, { status: 400 });
    }

    const parsed = updatePaymentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYMENT_UPDATE", message: parsed.error.issues[0]?.message || "Invalid payment update." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const paymentId = new ObjectId(params.id);
    const payment = await db.collection("payments").findOne({ _id: paymentId });

    if (!payment) {
      return NextResponse.json({ error: { code: "PAYMENT_NOT_FOUND", message: "Payment record was not found." } }, { status: 404 });
    }

    const now = new Date();
    await db.collection("payments").updateOne(
      { _id: paymentId },
      {
        $set: {
          status: parsed.data.status,
          note: parsed.data.note ?? payment.note ?? "",
          reviewedBy: auth.user._id,
          reviewedAt: now,
          updatedAt: now,
        },
      },
    );

    if (parsed.data.status === "approved" && payment.userId) {
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await db.collection("users").updateOne(
        { _id: payment.userId },
        {
          $set: {
            subscriptionPlan: payment.plan,
            subscriptionStatus: "active",
            subscriptionStartedAt: now,
            subscriptionExpiresAt: expiresAt,
            aiCooldownUntil: null,
            updatedAt: now,
          },
        },
      );
    }

    if (parsed.data.status === "rejected" && payment.userId) {
      await db.collection("users").updateOne(
        { _id: payment.userId, subscriptionStatus: "pending" },
        {
          $set: {
            subscriptionStatus: "inactive",
            updatedAt: now,
          },
        },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_PAYMENT_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Could not update payment.",
        },
      },
      { status: 500 },
    );
  }
}
