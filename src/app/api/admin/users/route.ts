import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument, type UserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";
import { getSubscriptionProfile } from "@/lib/subscriptions";

export const runtime = "nodejs";

const DEFAULT_MONTHLY_AI_QUOTA = 200;

type UsageSummary = {
  _id: ObjectId;
  requests: number;
  successfulRequests: number;
  estimatedTokens: number;
};

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

function getMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function serializeUser(user: UserDocument, usage?: UsageSummary) {
  const role = isAdminEmail(user.email) ? "admin" : "user";
  const profile = getSubscriptionProfile({
    role,
    subscriptionPlan: user.subscriptionPlan,
    subscription: user.subscription,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role,
    createdAt: user.createdAt?.toISOString?.() || new Date().toISOString(),
    authProvider: user.authProvider || "email",
    aiQuotaLimit: typeof user.aiQuotaLimit === "number" ? user.aiQuotaLimit : DEFAULT_MONTHLY_AI_QUOTA,
    aiDisabled: user.aiDisabled === true,
    subscriptionPlan: profile.plan,
    subscriptionStatus: profile.status,
    subscriptionLabel: profile.label,
    subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString?.() || null,
    aiCooldownUntil: user.aiCooldownUntil?.toISOString?.() || null,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    monthlyUsage: {
      requests: usage?.requests || 0,
      successfulRequests: usage?.successfulRequests || 0,
      estimatedTokens: usage?.estimatedTokens || 0,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    await ensureIndexes();
    const db = await getDb();
    const users = await db.collection<UserDocument>("users")
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const usage = await db.collection("aiUsage").aggregate<UsageSummary>([
      {
        $match: {
          userId: { $exists: true },
          createdAt: { $gte: getMonthStart() },
        },
      },
      {
        $group: {
          _id: "$userId",
          requests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          estimatedTokens: {
            $sum: { $add: [{ $ifNull: ["$estimatedInputTokens", 0] }, { $ifNull: ["$estimatedOutputTokens", 0] }] },
          },
        },
      },
    ]).toArray();

    const usageMap = new Map(usage.map((item) => [item._id.toString(), item]));

    return NextResponse.json({
      users: users.map((user) => serializeUser(user, usageMap.get(user._id.toString()))),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_USERS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load users.",
        },
      },
      { status: 500 },
    );
  }
}
