import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";

// Connect to hivecfm-core's database to validate user credentials
const DATABASE_URL = process.env.HIVECFM_DATABASE_URL || process.env.DATABASE_URL;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool && DATABASE_URL) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 3,
      ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    });
  }
  if (!pool) {
    throw new Error("Database not configured for license portal authentication");
  }
  return pool;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "HiveCFM Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const db = getPool();
          const result = await db.query(
            `SELECT id, email, name, password FROM "User" WHERE email = $1 AND "isActive" = true LIMIT 1`,
            [credentials.email.toLowerCase()]
          );

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          if (!user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || "Admin",
          };
        } catch (error) {
          console.error("License portal auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
