import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            console.log("[auth] Missing credentials");
            return null;
          }

          const { getSheetData } = await import("@/lib/sheets");
          const rows = await getSheetData("users");
          const headers = rows[0] ?? [];
          const users = rows.slice(1).map((row) =>
            Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
          );

          const user = users.find(
            (u) => u.username === credentials.username && u.status === "Active"
          );
          if (!user) return null;

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          );
          if (!valid) return null;

          return {
            id: user.user_id,
            name: user.full_name,
            email: user.username,
            role: user.role,
          } as any;

        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
});