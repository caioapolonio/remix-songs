import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  renderResetPasswordEmail,
  renderVerificationEmail,
  sendEmail,
} from "@/lib/email";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ password, hash }) => bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Redefinir senha — remix-songs",
        html: renderResetPasswordEmail({ name: user.name, url }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Por padrão o better-auth manda pra "/" após verificar. Forçamos /app.
      const verifyUrl = new URL(url);
      verifyUrl.searchParams.set("callbackURL", "/app");
      await sendEmail({
        to: user.email,
        subject: "Confirme seu email — remix-songs",
        html: renderVerificationEmail({ name: user.name, url: verifyUrl.toString() }),
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db
            .insert(schema.profiles)
            .values({ id: user.id, subscriptionStatus: "free" })
            .onConflictDoNothing();
        },
      },
    },
  },
  trustedOrigins: [baseURL],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Lê a sessão atual a partir dos cookies da request (server components,
 * route handlers, server actions). Retorna `{ user, session }` ou `null`.
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
