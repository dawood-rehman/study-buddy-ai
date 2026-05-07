import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAdminEmail } from "@/lib/server/admin";
import { ensureIndexes, getDb } from "@/lib/server/mongodb";

export const { handlers, auth } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      await ensureIndexes();
      const db = await getDb();
      const now = new Date();
      const email = user.email.trim().toLowerCase();

      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            name: user.name || email.split("@")[0],
            image: user.image,
            authProvider: "google",
            role: isAdminEmail(email) ? "admin" : "user",
            updatedAt: now,
          },
          $setOnInsert: {
            email,
            passwordHash: "",
            salt: "",
            createdAt: now,
          },
        },
        { upsert: true },
      );

      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;

      await ensureIndexes();
      const db = await getDb();
      const user = await db.collection("users").findOne({ email: token.email.trim().toLowerCase() });

      if (user) {
        token.userId = user._id.toString();
        token.role = isAdminEmail(user.email) ? "admin" : "user";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = typeof token.userId === "string" ? token.userId : undefined;
        (session.user as { id?: string; role?: string }).role = typeof token.role === "string" ? token.role : "user";
      }

      return session;
    },
  },
});
