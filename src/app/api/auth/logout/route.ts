import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, deleteCurrentSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await deleteCurrentSession(request);
  } catch {
    // Logout should still clear the browser session even if the database is temporarily unavailable.
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
