import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getAuthenticatedUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const response = NextResponse.json({ user });

    if (!user && request.cookies.get("study_buddy_session")) {
      clearSessionCookie(response);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Could not load session.",
        },
      },
      { status: 500 },
    );
  }
}
