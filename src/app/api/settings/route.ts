import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserDocument } from "@/lib/server/auth";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

const defaultSettings = {
  defaultLanguage: "english",
  offlineMode: false,
  stepByStep: true,
  detail: "medium",
};

const settingsSchema = z.object({
  defaultLanguage: z.enum(["english", "urdu", "roman-urdu"]).optional(),
  offlineMode: z.boolean().optional(),
  stepByStep: z.boolean().optional(),
  detail: z.enum(["simple", "medium", "detailed"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    await ensureIndexes();
    const db = await getDb();
    const settings = await db.collection("settings").findOne({ userId: user._id });

    return NextResponse.json({
      settings: {
        ...defaultSettings,
        ...(settings || {}),
        _id: undefined,
        userId: undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SETTINGS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load settings.",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserDocument(request);

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
    }

    const parsed = settingsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_SETTINGS", message: parsed.error.issues[0]?.message || "Invalid settings request." } },
        { status: 400 },
      );
    }

    await ensureIndexes();
    const db = await getDb();
    await db.collection("settings").updateOne(
      { userId: user._id },
      {
        $set: {
          ...parsed.data,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          userId: user._id,
        },
      },
      { upsert: true },
    );

    const settings = await db.collection("settings").findOne({ userId: user._id });

    return NextResponse.json({
      settings: {
        ...defaultSettings,
        ...(settings || {}),
        _id: undefined,
        userId: undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SETTINGS_SAVE_FAILED",
          message: error instanceof Error ? error.message : "Could not save settings.",
        },
      },
      { status: 500 },
    );
  }
}
