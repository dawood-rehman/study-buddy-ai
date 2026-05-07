import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";
import { folderForItem, type LibraryItemType } from "@/lib/library-utils";

export const runtime = "nodejs";

const libraryItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160, "Title is too long."),
  type: z.enum(["book", "summary", "quiz", "study", "grammar", "counseling", "resume", "past-paper", "general-ai"]),
  content: z.string().trim().min(1, "Content is required.").max(80_000, "Content is too long."),
  source: z.string().trim().max(120).optional(),
  folder: z.string().trim().max(180).optional(),
});

type LibraryItemDocument = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  folder: string;
  type: LibraryItemType;
  content: string;
  source?: string;
  createdAt: Date;
};

function serializeLibraryItem(item: LibraryItemDocument) {
  return {
    id: item._id.toString(),
    title: item.title,
    folder: item.folder,
    type: item.type,
    content: item.content,
    source: item.source,
    createdAt: item.createdAt.toISOString(),
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
    const items = await db.collection("libraryItems")
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();

    return NextResponse.json({ items: items.map(serializeLibraryItem) });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "LIBRARY_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load library.",
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

    const parsed = libraryItemSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_LIBRARY_ITEM", message: parsed.error.issues[0]?.message || "Invalid library item." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    const now = new Date();
    const itemData = parsed.data;
    const item = {
      userId: user._id,
      title: itemData.title,
      type: itemData.type,
      content: itemData.content,
      source: itemData.source,
      folder: itemData.folder || folderForItem(itemData.type, itemData.title),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("libraryItems").insertOne(item);

    return NextResponse.json({
      item: serializeLibraryItem({ ...item, _id: result.insertedId }),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "LIBRARY_SAVE_FAILED",
          message: error instanceof Error ? error.message : "Could not save library item.",
        },
      },
      { status: 500 },
    );
  }
}
