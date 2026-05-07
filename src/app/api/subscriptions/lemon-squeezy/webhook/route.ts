import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import type { UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

type PaidPlan = "standard" | "advanced";
type AppSubscriptionStatus = "active" | "inactive" | "past_due" | "cancelled" | "pending";

type LemonWebhookEvent = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function verifyLemonSqueezySignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signatureHeader, "utf8");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getRecordValue(record: unknown, key: string) {
  return record && typeof record === "object" ? (record as Record<string, unknown>)[key] : undefined;
}

function parseDate(value: unknown) {
  const dateValue = asString(value);
  if (!dateValue) return null;

  const date = new Date(dateValue);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizePlan(value: unknown): PaidPlan | null {
  if (value === "standard" || value === "advanced") return value;
  return null;
}

function planFromVariantId(variantId: unknown): PaidPlan | null {
  const variant = asString(variantId);
  if (!variant) return null;
  if (variant === process.env.LEMONSQUEEZY_STANDARD_VARIANT_ID) return "standard";
  if (variant === process.env.LEMONSQUEEZY_ADVANCED_VARIANT_ID) return "advanced";
  return null;
}

function getPlan(event: LemonWebhookEvent): PaidPlan | null {
  return normalizePlan(event.meta?.custom_data?.plan) || planFromVariantId(event.data?.attributes?.variant_id);
}

function getExpiryDate(attributes: Record<string, unknown>) {
  const expiresAt = parseDate(attributes.renews_at) || parseDate(attributes.ends_at) || parseDate(attributes.trial_ends_at);
  if (expiresAt) return expiresAt;

  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  return fallback;
}

function mapSubscriptionStatus(providerStatus: string, expiresAt: Date): AppSubscriptionStatus {
  if (providerStatus === "active" || providerStatus === "on_trial" || providerStatus === "paused") return "active";
  if (providerStatus === "cancelled") return expiresAt.getTime() > Date.now() ? "active" : "cancelled";
  if (providerStatus === "past_due" || providerStatus === "unpaid") return "past_due";
  if (providerStatus === "expired") return "cancelled";
  return "inactive";
}

function getUserLookup(event: LemonWebhookEvent) {
  const attributes = event.data?.attributes || {};
  const customData = event.meta?.custom_data || {};
  const userId = asString(customData.user_id || customData.userId);
  const subscriptionId = asString(attributes.subscription_id || attributes.subscriptionId || event.data?.id);
  const email = asString(customData.user_email || customData.userEmail || attributes.user_email).trim().toLowerCase();

  return {
    userId: ObjectId.isValid(userId) ? new ObjectId(userId) : null,
    subscriptionId,
    email,
  };
}

function paymentAmount(plan: PaidPlan) {
  return plan === "advanced" ? 5 : 3;
}

async function findUser(db: Awaited<ReturnType<typeof getDb>>, event: LemonWebhookEvent) {
  const lookup = getUserLookup(event);
  const filters = [];

  if (lookup.userId) filters.push({ _id: lookup.userId });
  if (lookup.subscriptionId) filters.push({ lemonSqueezySubscriptionId: lookup.subscriptionId });
  if (lookup.email) filters.push({ email: lookup.email });

  if (filters.length === 0) return null;
  return db.collection<UserDocument>("users").findOne({ $or: filters });
}

async function upsertPaymentRecord({
  db,
  event,
  user,
  plan,
  status,
  note,
}: {
  db: Awaited<ReturnType<typeof getDb>>;
  event: LemonWebhookEvent;
  user: UserDocument;
  plan: PaidPlan;
  status: "approved" | "pending" | "rejected";
  note: string;
}) {
  const eventName = event.meta?.event_name || "lemon-squeezy-event";
  const attributes = event.data?.attributes || {};
  const providerEventId = `lemon-squeezy:${eventName}:${event.data?.type || "event"}:${event.data?.id || asString(attributes.subscription_id) || "unknown"}`;
  const now = new Date();

  await db.collection("payments").updateOne(
    { providerEventId },
    {
      $setOnInsert: {
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        plan,
        method: "lemon-squeezy",
        provider: "lemon-squeezy",
        providerEventId,
        transactionId: providerEventId,
        amount: paymentAmount(plan),
        currency: "USD",
        status,
        note,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

async function handleSubscriptionEvent(event: LemonWebhookEvent) {
  await ensureIndexes();
  const db = await getDb();
  const user = await findUser(db, event);
  const attributes = event.data?.attributes || {};
  const plan = getPlan(event) || normalizePlan(user?.subscriptionPlan) || "standard";

  if (!user || !plan) return;

  const now = new Date();
  const expiresAt = getExpiryDate(attributes);
  const providerStatus = asString(attributes.status || "active");
  const subscriptionStatus = mapSubscriptionStatus(providerStatus, expiresAt);
  const subscriptionId = asString(event.data?.id || attributes.subscription_id);

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        subscriptionPlan: plan,
        subscriptionStatus,
        subscriptionProvider: "lemon-squeezy",
        subscriptionProviderStatus: providerStatus,
        lemonSqueezySubscriptionId: subscriptionId || user.lemonSqueezySubscriptionId || null,
        lemonSqueezyCustomerId: asString(attributes.customer_id) || user.lemonSqueezyCustomerId || null,
        lemonSqueezyVariantId: asString(attributes.variant_id) || user.lemonSqueezyVariantId || null,
        lemonSqueezyCustomerPortalUrl: asString(getRecordValue(attributes.urls, "customer_portal")) || user.lemonSqueezyCustomerPortalUrl || null,
        subscriptionStartedAt: parseDate(attributes.created_at) || user.subscriptionStartedAt || now,
        subscriptionExpiresAt: expiresAt,
        aiCooldownUntil: null,
        updatedAt: now,
      },
    },
  );

  const eventName = event.meta?.event_name || "";
  if (["subscription_created", "subscription_payment_success", "subscription_payment_recovered"].includes(eventName)) {
    await upsertPaymentRecord({
      db,
      event,
      user,
      plan,
      status: "approved",
      note: "Automatic Lemon Squeezy subscription payment.",
    });
  }
}

async function handleSubscriptionInvoiceEvent(event: LemonWebhookEvent) {
  await ensureIndexes();
  const db = await getDb();
  const user = await findUser(db, event);
  const plan = getPlan(event) || normalizePlan(user?.subscriptionPlan);
  const eventName = event.meta?.event_name || "";
  const attributes = event.data?.attributes || {};
  const subscriptionId = asString(attributes.subscription_id || attributes.subscriptionId);

  if (!user || !plan) return;

  if (eventName === "subscription_payment_failed") {
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          subscriptionStatus: "past_due",
          subscriptionProviderStatus: "past_due",
          updatedAt: new Date(),
        },
      },
    );
    return;
  }

  if (eventName === "subscription_payment_success" || eventName === "subscription_payment_recovered") {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          subscriptionPlan: plan,
          subscriptionStatus: "active",
          subscriptionProvider: "lemon-squeezy",
          subscriptionProviderStatus: "active",
          lemonSqueezySubscriptionId: subscriptionId || user.lemonSqueezySubscriptionId || null,
          subscriptionExpiresAt: expiresAt,
          aiCooldownUntil: null,
          updatedAt: new Date(),
        },
      },
    );

    await upsertPaymentRecord({
      db,
      event,
      user,
      plan,
      status: "approved",
      note: "Automatic Lemon Squeezy recurring payment.",
    });
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text();

  if (!verifyLemonSqueezySignature(payload, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: { code: "INVALID_LEMONSQUEEZY_SIGNATURE", message: "Invalid Lemon Squeezy signature." } }, { status: 400 });
  }

  const event = JSON.parse(payload) as LemonWebhookEvent;
  const eventName = event.meta?.event_name || "";

  if (eventName.startsWith("subscription_payment_")) {
    await handleSubscriptionInvoiceEvent(event);
  } else if (eventName.startsWith("subscription_")) {
    await handleSubscriptionEvent(event);
  }

  return NextResponse.json({ received: true });
}
