import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  category: z.enum(["feedback", "complaint", "bug", "feature"]),
  subject: z.string().trim().min(3, "Subject is required.").max(140, "Subject is too long."),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(8000, "Message is too long."),
});

type FeedbackDocument = {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  email: string;
  category: "feedback" | "complaint" | "bug" | "feature";
  subject: string;
  message: string;
  status: "open" | "in-review" | "resolved";
  adminReply?: string;
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

    await ensureIndexes();
    const db = await getDb();
    const items = await db.collection<FeedbackDocument>("feedback")
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ items: items.map(serializeFeedback) });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "FEEDBACK_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load feedback.",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    const parsed = feedbackSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_FEEDBACK", message: parsed.error.issues[0]?.message || "Invalid feedback request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const now = new Date();
    const item = {
      userId: user._id,
      name: user.name,
      email: user.email,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "open" as const,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("feedback").insertOne(item);

    return NextResponse.json({
      item: serializeFeedback({ ...item, _id: result.insertedId }),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "FEEDBACK_SAVE_FAILED",
          message: error instanceof Error ? error.message : "Could not send feedback.",
        },
      },
      { status: 500 },
    );
  }
}
