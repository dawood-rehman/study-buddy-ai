import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";
import { localPaymentMethodOrder, normalizeLocalPaymentMethods } from "@/lib/payment-methods";

export const runtime = "nodejs";

const paymentMethodSchema = z.object({
  label: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().min(3).max(80),
  accountTitle: z.string().trim().min(2).max(120),
  iban: z.string().trim().max(80).optional(),
  instructions: z.string().trim().max(400).optional(),
  enabled: z.boolean(),
});

const updatePaymentMethodsSchema = z.object({
  methods: z.object({
    easypaisa: paymentMethodSchema,
    jazzcash: paymentMethodSchema,
    bank: paymentMethodSchema,
  }),
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    await ensureIndexes();
    const db = await getDb();
    const setting = await db.collection("platformSettings").findOne({ key: "localPaymentMethods" });

    return NextResponse.json({
      methods: normalizeLocalPaymentMethods(setting?.methods),
      updatedAt: setting?.updatedAt?.toISOString?.() || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_PAYMENT_METHODS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load payment methods.",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const parsed = updatePaymentMethodsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYMENT_METHODS", message: parsed.error.issues[0]?.message || "Invalid payment methods." } },
        { status: 400 },
      );
    }

    const methods = normalizeLocalPaymentMethods(parsed.data.methods);
    const now = new Date();

    await ensureIndexes();
    const db = await getDb();
    await db.collection("platformSettings").updateOne(
      { key: "localPaymentMethods" },
      {
        $set: {
          key: "localPaymentMethods",
          methods,
          methodOrder: localPaymentMethodOrder,
          updatedBy: auth.user._id,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ methods, updatedAt: now.toISOString() });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_PAYMENT_METHODS_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Could not update payment methods.",
        },
      },
      { status: 500 },
    );
  }
}
