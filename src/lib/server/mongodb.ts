import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "study-buddy-ai";

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
  indexesPromise?: Promise<void>;
};

declare global {
  var __studyBuddyMongo: MongoCache | undefined;
}

const cache = globalThis.__studyBuddyMongo || { client: undefined, promise: undefined };
globalThis.__studyBuddyMongo = cache;

export function assertMongoConfigured() {
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to .env locally and Vercel Environment Variables in production.");
  }
}

export async function getMongoClient() {
  assertMongoConfigured();

  if (cache.client) return cache.client;

  if (!cache.promise) {
    cache.promise = new MongoClient(uri as string, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }

  cache.client = await cache.promise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

export async function ensureIndexes() {
  if (cache.indexesPromise) return cache.indexesPromise;

  cache.indexesPromise = getDb().then(async (db) => {
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("users").createIndex({ subscriptionPlan: 1, subscriptionStatus: 1 }),
      db.collection("users").createIndex({ aiCooldownUntil: 1 }),
      db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
      db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("libraryItems").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("libraryItems").createIndex({ userId: 1, folder: 1 }),
      db.collection("settings").createIndex({ userId: 1 }, { unique: true }),
      db.collection("feedback").createIndex({ createdAt: -1 }),
      db.collection("feedback").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("feedback").createIndex({ status: 1, createdAt: -1 }),
      db.collection("books").createIndex({ status: 1, createdAt: -1 }),
      db.collection("books").createIndex({ language: 1, status: 1 }),
      db.collection("books").createIndex({ genres: 1, status: 1 }),
      db.collection("books").createIndex({ tags: 1, status: 1 }),
      db.collection("bookFiles").createIndex({ uploadedBy: 1, createdAt: -1 }),
      db.collection("bookFiles").createIndex({ createdAt: -1 }),
      db.collection("aiUsage").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("aiUsage").createIndex({ createdAt: -1 }),
      db.collection("aiUsage").createIndex({ status: 1, createdAt: -1 }),
      db.collection("passwordResetTokens").createIndex({ tokenHash: 1 }, { unique: true }),
      db.collection("passwordResetTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("passwordResetTokens").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("payments").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("payments").createIndex({ status: 1, createdAt: -1 }),
      db.collection("payments").createIndex({ plan: 1, status: 1 }),
      db.collection("payments").createIndex({ providerEventId: 1 }, { unique: true, sparse: true }),
    ]);
  }).catch((error) => {
    cache.indexesPromise = undefined;
    throw error;
  });

  return cache.indexesPromise;
}
