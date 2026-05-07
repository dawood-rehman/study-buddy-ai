import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const localPaymentSchema = z.object({
  plan: z.enum(["standard", "advanced"]),
  method: z.enum(["easypaisa", "jazzcash", "bank"]),
  amount: z.coerce.number().min(0),
  currency: z.string().trim().min(2).max(8).default("PKR"),
  transactionId: z.string().trim().min(3, "Transaction ID is required.").max(120),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    const parsed = localPaymentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_LOCAL_PAYMENT", message: parsed.error.issues[0]?.message || "Invalid payment request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const now = new Date();

    await db.collection("payments").insertOne({
      ...parsed.data,
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      status: "pending",
      source: "user-local-payment",
      createdAt: now,
      updatedAt: now,
    });

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          subscriptionPlan: parsed.data.plan,
          subscriptionStatus: "pending",
          updatedAt: now,
        },
      },
    );

    return NextResponse.json({
      ok: true,
      message: "Payment submitted for admin verification. Your subscription will activate after approval.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "LOCAL_PAYMENT_FAILED",
          message: error instanceof Error ? error.message : "Could not submit payment.",
        },
      },
      { status: 500 },
    );
  }
}
