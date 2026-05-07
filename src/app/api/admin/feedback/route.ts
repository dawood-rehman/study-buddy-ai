import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAdminEmail } from "@/lib/server/admin";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

type FeedbackDocument = {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  email: string;
  category: "feedback" | "complaint" | "bug" | "feature";
  subject: string;
  message: string;
  status: "open" | "in-review" | "pending" | "resolved" | "rejected";
  adminReply?: string;
  statusNote?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
};

function serializeFeedback(item: FeedbackDocument) {
  return {
    id: item._id.toString(),
    name: item.name,
    email: item.email,
    category: item.category,
    subject: item.subject,
    message: item.message,
    status: item.status,
    adminReply: item.adminReply,
    statusNote: item.statusNote,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });
    }

    await ensureIndexes();
    const db = await getDb();
    const items = await db.collection<FeedbackDocument>("feedback")
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({ items: items.map(serializeFeedback) });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ADMIN_FEEDBACK_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load admin feedback.",
        },
      },
      { status: 500 },
    );
  }
}
