import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.enum(["standard", "advanced"]),
  provider: z.enum(["stripe"]).default("stripe"),
});

function getAppUrl(request: NextRequest) {
  return process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

function getStripePriceId(plan: "standard" | "advanced") {
  return plan === "standard" ? process.env.STRIPE_STANDARD_PRICE_ID : process.env.STRIPE_ADVANCED_PRICE_ID;
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

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = getStripePriceId(parsed.data.plan);

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

    const appUrl = getAppUrl(request);
    const body = new URLSearchParams({
      mode: "subscription",
      customer_email: user.email,
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/dashboard?subscription=cancelled`,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "metadata[userId]": user._id.toString(),
      "metadata[plan]": parsed.data.plan,
      "subscription_data[metadata][userId]": user._id.toString(),
      "subscription_data[metadata][plan]": parsed.data.plan,
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

    return NextResponse.json({ url: payload.url, id: payload.id });
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
