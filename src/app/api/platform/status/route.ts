import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hasAll(values: Array<string | undefined>) {
  return values.every((value) => Boolean(value?.trim()));
}

export async function GET() {
  const stripeConfigured = hasAll([
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_STANDARD_PRICE_ID,
    process.env.STRIPE_ADVANCED_PRICE_ID,
    process.env.STRIPE_WEBHOOK_SECRET,
  ]);

  const lemonSqueezyConfigured = hasAll([
    process.env.LEMONSQUEEZY_API_KEY,
    process.env.LEMONSQUEEZY_STORE_ID,
    process.env.LEMONSQUEEZY_STANDARD_VARIANT_ID,
    process.env.LEMONSQUEEZY_ADVANCED_VARIANT_ID,
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  ]);

  return NextResponse.json({
    payments: {
      stripeConfigured,
      lemonSqueezyConfigured,
      automatedPaymentsConfigured: stripeConfigured || lemonSqueezyConfigured,
      fullyConfigured: stripeConfigured && lemonSqueezyConfigured,
    },
    underConstructionNotice: !(stripeConfigured && lemonSqueezyConfigured),
  });
}
