import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const paymentSchema = z.object({
  userId: z.string().trim().refine((value) => ObjectId.isValid(value), "Valid user is required."),
  plan: z.enum(["standard", "advanced"]),
  method: z.enum(["easypaisa", "jazzcash", "bank", "stripe", "paypal", "paddle", "lemon-squeezy", "manual"]),
  amount: z.coerce.number().min(0),
  currency: z.string().trim().min(2).max(8).default("USD"),
  transactionId: z.string().trim().max(120).optional(),
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

type PaymentRecord = {
  _id: ObjectId;
  userId?: ObjectId;
  userEmail?: string;
  userName?: string;
  plan?: string;
  method?: string;
  amount?: number;
  currency?: string;
  status?: string;
  transactionId?: string;
  note?: string;
  createdAt?: Date;
  reviewedAt?: Date;
};

function serializePayment(item: PaymentRecord) {
  return {
    id: item._id.toString(),
    userId: item.userId?.toString?.() || "",
    userEmail: item.userEmail || "",
    userName: item.userName || "",
    plan: item.plan,
    method: item.method,
    amount: item.amount || 0,
    currency: item.currency || "USD",
    status: item.status || "pending",
    transactionId: item.transactionId || "",
    note: item.note || "",
    createdAt: item.createdAt?.toISOString?.() || new Date().toISOString(),
    reviewedAt: item.reviewedAt?.toISOString?.() || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    await ensureIndexes();
    const db = await getDb();
    const payments = await db.collection("payments").find({}).sort({ createdAt: -1 }).limit(300).toArray();
    const [summary] = await db.collection("payments").aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$amount" },
          approvedPayments: { $sum: 1 },
        },
      },
    ]).toArray();
    const activeSubscribers = await db.collection("users").countDocuments({
      subscriptionStatus: "active",
      subscriptionPlan: { $in: ["standard", "advanced"] },
    });

    return NextResponse.json({
      payments: payments.map(serializePayment),
      summary: {
        revenue: summary?.revenue || 0,
        approvedPayments: summary?.approvedPayments || 0,
        activeSubscribers,
        pendingPayments: payments.filter((payment) => payment.status === "pending").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_PAYMENTS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load payments.",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const parsed = paymentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYMENT", message: parsed.error.issues[0]?.message || "Invalid payment." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const userId = new ObjectId(parsed.data.userId);
    const user = await db.collection("users").findOne({ _id: userId });

    if (!user) {
      return NextResponse.json({ error: { code: "USER_NOT_FOUND", message: "User was not found." } }, { status: 404 });
    }

    const now = new Date();
    const result = await db.collection("payments").insertOne({
      ...parsed.data,
      userId,
      userEmail: user.email,
      userName: user.name,
      status: "pending",
      createdBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ paymentId: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_PAYMENT_CREATE_FAILED",
          message: error instanceof Error ? error.message : "Could not create payment record.",
        },
      },
      { status: 500 },
    );
  }
}
