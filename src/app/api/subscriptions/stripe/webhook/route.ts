import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

type StripeEvent = {
  type: string;
  data?: {
    object?: {
      metadata?: {
        userId?: string;
        plan?: "standard" | "advanced";
      };
      subscription?: string;
      status?: string;
      current_period_end?: number;
    };
  };
};

function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const timestamp = signatureHeader.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const signature = signatureHeader.split(",").find((part) => part.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

async function activateSubscription(event: StripeEvent) {
  const object = event.data?.object;
  const userId = object?.metadata?.userId;
  const plan = object?.metadata?.plan;

  if (!userId || !ObjectId.isValid(userId) || (plan !== "standard" && plan !== "advanced")) return;

  await ensureIndexes();
  const db = await getDb();
  const now = new Date();
  const expiresAt = object?.current_period_end ? new Date(object.current_period_end * 1000) : new Date(now);
  if (!object?.current_period_end) expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        subscriptionProvider: "stripe",
        stripeSubscriptionId: object?.subscription || null,
        subscriptionStartedAt: now,
        subscriptionExpiresAt: expiresAt,
        aiCooldownUntil: null,
        updatedAt: now,
      },
    },
  );
}

async function deactivateSubscription(event: StripeEvent) {
  const object = event.data?.object;
  const userId = object?.metadata?.userId;

  if (!userId || !ObjectId.isValid(userId)) return;

  await ensureIndexes();
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        subscriptionStatus: "cancelled",
        updatedAt: new Date(),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const payload = await request.text();

  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: { code: "INVALID_STRIPE_SIGNATURE", message: "Invalid Stripe signature." } }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    await activateSubscription(event);
  }

  if (event.type === "customer.subscription.deleted") {
    await deactivateSubscription(event);
  }

  return NextResponse.json({ received: true });
}
