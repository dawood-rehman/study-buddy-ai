import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { auth as authJs } from "@/auth";
import { isAdminEmail } from "@/lib/server/admin";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";
import { getSubscriptionProfile, type SubscriptionPlan, type SubscriptionStatus } from "@/lib/subscriptions";

const pbkdf2 = promisify(pbkdf2Callback);
const sessionCookieName = "study_buddy_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: "admin" | "user";
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionLabel: string;
  subscriptionExpiresAt?: string;
  aiQuotaLimit?: number;
  aiDisabled?: boolean;
  aiCooldownUntil?: string;
  hasPassword: boolean;
};

export type UserDocument = Document & {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: Date;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function toPublicUser(user: UserDocument): PublicUser {
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
    createdAt: user.createdAt.toISOString(),
    role,
    subscriptionPlan: profile.plan,
    subscriptionStatus: profile.status,
    subscriptionLabel: profile.label,
    subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString?.(),
    aiQuotaLimit: user.aiQuotaLimit,
    aiDisabled: user.aiDisabled === true,
    aiCooldownUntil: user.aiCooldownUntil?.toISOString?.(),
    hasPassword: Boolean(user.passwordHash && user.salt),
  };
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = await pbkdf2(password, salt, 210_000, 64, "sha512");
  return {
    salt,
    passwordHash: derived.toString("hex"),
  };
}

export async function verifyPassword(password: string, salt: string, passwordHash: string) {
  const derived = await pbkdf2(password, salt, 210_000, 64, "sha512");
  const stored = Buffer.from(passwordHash, "hex");

  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAgeSeconds,
    path: "/",
  };
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

export async function createSessionResponse(user: UserDocument, init?: ResponseInit) {
  await ensureIndexes();
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionMaxAgeSeconds * 1000);

  await db.collection("sessions").insertOne({
    userId: user._id,
    tokenHash: hashSessionToken(token),
    createdAt: now,
    expiresAt,
  });

  const response = NextResponse.json({ user: toPublicUser(user) }, init);
  response.cookies.set(sessionCookieName, token, sessionCookieOptions());
  return response;
}

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  await ensureIndexes();
  const db = await getDb();

  if (token) {
    const session = await db.collection("sessions").findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (session?.userId) {
      const user = await db.collection<UserDocument>("users").findOne({ _id: session.userId });
      if (user) return toPublicUser(user);
    }
  }

  const authSession = await authJs();
  const email = authSession?.user?.email?.trim().toLowerCase();

  if (!email) return null;

  const authUser = await db.collection<UserDocument>("users").findOne({ email });
  return authUser ? toPublicUser(authUser) : null;
}

export async function getAuthenticatedUserDocument(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  await ensureIndexes();
  const db = await getDb();

  if (token) {
    const session = await db.collection("sessions").findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (session?.userId) {
      const user = await db.collection<UserDocument>("users").findOne({ _id: session.userId });
      if (user) return user;
    }
  }

  const authSession = await authJs();
  const email = authSession?.user?.email?.trim().toLowerCase();

  if (!email) return null;

  return db.collection<UserDocument>("users").findOne({ email });
}

export async function deleteCurrentSession(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) return;

  const db = await getDb();
  await db.collection("sessions").deleteOne({ tokenHash: hashSessionToken(token) });
}

export function normalizedUserEmail(email: string) {
  return normalizeEmail(email);
}
