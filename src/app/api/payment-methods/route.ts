import { NextResponse } from "next/server";
import { normalizeLocalPaymentMethods } from "@/lib/payment-methods";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
          code: "PAYMENT_METHODS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load payment methods.",
        },
      },
      { status: 500 },
    );
  }
}
