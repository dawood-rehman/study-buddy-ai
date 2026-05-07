import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserDocument, type UserDocument } from "@/lib/server/auth";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.enum(["standard", "advanced"]),
  provider: z.enum(["stripe", "lemon-squeezy"]).default("stripe"),
});

type LemonSqueezyErrorPayload = {
  errors?: Array<{
    detail?: string;
    title?: string;
  }>;
  message?: string;
};

type LemonSqueezyCheckoutPayload = LemonSqueezyErrorPayload & {
  data?: {
    id?: string;
    attributes?: {
      url?: string;
    };
  };
};

function getAppUrl(request: NextRequest) {
  return process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

function getStripePriceId(plan: "standard" | "advanced") {
  return plan === "standard" ? process.env.STRIPE_STANDARD_PRICE_ID : process.env.STRIPE_ADVANCED_PRICE_ID;
}

function getLemonSqueezyVariantId(plan: "standard" | "advanced") {
  return plan === "standard" ? process.env.LEMONSQUEEZY_STANDARD_VARIANT_ID : process.env.LEMONSQUEEZY_ADVANCED_VARIANT_ID;
}

function parseLemonSqueezyError(payload: LemonSqueezyErrorPayload | null) {
  return payload?.errors?.[0]?.detail || payload?.errors?.[0]?.title || payload?.message || "Lemon Squeezy checkout could not be created.";
}

async function createStripeCheckout({
  user,
  plan,
  appUrl,
}: {
  user: UserDocument;
  plan: "standard" | "advanced";
  appUrl: string;
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = getStripePriceId(plan);

  if (!secretKey || !priceId) {
    return NextResponse.json(
      {
        error: {
          code: "STRIPE_NOT_CONFIGURED",
          message: "Stripe checkout is not configured. Add STRIPE_SECRET_KEY and plan price IDs in environment variables.",
        },
      },
      { status: 501 },
    );
  }

  const body = new URLSearchParams({
    mode: "subscription",
    customer_email: user.email,
    success_url: `${appUrl}/dashboard?subscription=success&provider=stripe`,
    cancel_url: `${appUrl}/dashboard?subscription=cancelled&provider=stripe`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[userId]": user._id.toString(),
    "metadata[plan]": plan,
    "subscription_data[metadata][userId]": user._id.toString(),
    "subscription_data[metadata][plan]": plan,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: {
          code: "STRIPE_CHECKOUT_FAILED",
          message: payload?.error?.message || "Stripe checkout could not be created.",
        },
      },
      { status: response.status },
    );
  }

  return NextResponse.json({ url: payload.url, id: payload.id, provider: "stripe" });
}

async function createLemonSqueezyCheckout({
  user,
  plan,
  appUrl,
}: {
  user: UserDocument;
  plan: "standard" | "advanced";
  appUrl: string;
}) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = getLemonSqueezyVariantId(plan);

  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json(
      {
        error: {
          code: "LEMONSQUEEZY_NOT_CONFIGURED",
          message:
            "Lemon Squeezy checkout is not configured. Add LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and plan variant IDs in environment variables.",
        },
      },
      { status: 501 },
    );
  }

  const variantNumber = Number(variantId);
  const checkoutPayload = {
    data: {
      type: "checkouts",
      attributes: {
        product_options: {
          enabled_variants: Number.isFinite(variantNumber) ? [variantNumber] : undefined,
          redirect_url: `${appUrl}/dashboard?subscription=success&provider=lemon-squeezy`,
          receipt_button_text: "Open Study Buddy AI",
          receipt_link_url: `${appUrl}/dashboard`,
          receipt_thank_you_note: "Your Study Buddy AI subscription is active. Thank you!",
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          discount: true,
          subscription_preview: true,
          button_color: "#0f766e",
          button_text_color: "#ffffff",
        },
        checkout_data: {
          email: user.email,
          name: user.name,
          custom: {
            user_id: user._id.toString(),
            user_email: user.email,
            plan,
            provider: "lemon-squeezy",
          },
        },
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        test_mode: process.env.LEMONSQUEEZY_TEST_MODE === "true",
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: storeId,
          },
        },
        variant: {
          data: {
            type: "variants",
            id: variantId,
          },
        },
      },
    },
  };

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(checkoutPayload),
  });
  const payload = await response.json().catch(() => null) as LemonSqueezyCheckoutPayload | null;

  if (!response.ok) {
    return NextResponse.json(
      {
        error: {
          code: "LEMONSQUEEZY_CHECKOUT_FAILED",
          message: parseLemonSqueezyError(payload),
        },
      },
      { status: response.status },
    );
  }

  return NextResponse.json({ url: payload?.data?.attributes?.url, id: payload?.data?.id, provider: "lemon-squeezy" });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    const parsed = checkoutSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_CHECKOUT", message: parsed.error.issues[0]?.message || "Invalid checkout request." } },
        { status: 400 },
      );
    }

    const appUrl = getAppUrl(request);

    if (parsed.data.provider === "lemon-squeezy") {
      return createLemonSqueezyCheckout({ user, plan: parsed.data.plan, appUrl });
    }

    return createStripeCheckout({ user, plan: parsed.data.plan, appUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "CHECKOUT_FAILED",
          message: error instanceof Error ? error.message : "Checkout failed.",
        },
      },
      { status: 500 },
    );
  }
}
