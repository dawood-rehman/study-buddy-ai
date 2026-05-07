import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

type AiUsageLog = {
  _id: unknown;
  email?: string;
  task?: string;
  language?: string;
  modelKey?: string;
  requestedModels?: string[];
  resolvedModel?: string;
  status?: string;
  durationMs?: number;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  reportedTotalTokens?: number;
  errorCode?: string;
  createdAt?: Date;
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

function serializeLog(item: AiUsageLog) {
  return {
    id: String(item._id),
    email: item.email || "Guest",
    task: item.task || "study",
    language: item.language || "english",
    modelKey: item.modelKey || "auto",
    requestedModels: item.requestedModels || [],
    resolvedModel: item.resolvedModel || "n/a",
    status: item.status || "failed",
    durationMs: item.durationMs || 0,
    estimatedTokens: (item.estimatedInputTokens || 0) + (item.estimatedOutputTokens || 0),
    reportedTotalTokens: item.reportedTotalTokens || null,
    errorCode: item.errorCode || null,
    createdAt: item.createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    await ensureIndexes();
    const db = await getDb();
    const monthStart = getMonthStart();
    const [summary] = await db.collection("aiUsage").aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          successfulRequests: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          failedRequests: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          blockedRequests: {
            $sum: { $cond: [{ $in: ["$status", ["quota-blocked", "disabled"]] }, 1, 0] },
          },
          averageDurationMs: { $avg: "$durationMs" },
          estimatedTokens: {
            $sum: { $add: [{ $ifNull: ["$estimatedInputTokens", 0] }, { $ifNull: ["$estimatedOutputTokens", 0] }] },
          },
        },
      },
    ]).toArray();

    const byModel = await db.collection("aiUsage").aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { $ifNull: ["$resolvedModel", "$modelKey"] },
          requests: { $sum: 1 },
          successfulRequests: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          averageDurationMs: { $avg: "$durationMs" },
        },
      },
      { $sort: { requests: -1 } },
      { $limit: 12 },
    ]).toArray();

    const byDay = await db.collection("aiUsage").aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          requests: { $sum: 1 },
          successfulRequests: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    const logs = await db.collection<AiUsageLog>("aiUsage")
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      summary: {
        totalRequests: summary?.totalRequests || 0,
        successfulRequests: summary?.successfulRequests || 0,
        failedRequests: summary?.failedRequests || 0,
        blockedRequests: summary?.blockedRequests || 0,
        averageDurationMs: Math.round(summary?.averageDurationMs || 0),
        estimatedTokens: summary?.estimatedTokens || 0,
      },
      byModel: byModel.map((item) => ({
        model: item._id || "unknown",
        requests: item.requests,
        successfulRequests: item.successfulRequests,
        averageDurationMs: Math.round(item.averageDurationMs || 0),
      })),
      byDay: byDay.map((item) => ({
        day: item._id,
        requests: item.requests,
        successfulRequests: item.successfulRequests,
      })),
      logs: logs.map(serializeLog),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_USAGE_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load AI usage.",
        },
      },
      { status: 500 },
    );
  }
}
