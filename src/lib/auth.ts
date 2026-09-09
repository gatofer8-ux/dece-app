import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { UserRow, Role } from "./types";
import { logAudit } from "./audit";
import { env } from "./env";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = db
          .prepare("SELECT * FROM users WHERE email = ? AND active = 1")
          .get(credentials.email.toLowerCase().trim()) as UserRow | undefined;

        if (!user) {
          logAudit({ userId: null, action: "LOGIN_FALLIDO", entityType: "User", details: credentials.email });
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) {
          logAudit({
            userId: user.id,
            action: "LOGIN_FALLIDO",
            entityType: "User",
            entityId: user.id,
            institutionId: user.institution_id,
          });
          return null;
        }

        logAudit({
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          institutionId: user.institution_id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          institution_id: user.institution_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role as Role;
        token.id = (user as any).id as string;
        token.institution_id = (user as any).institution_id as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as Role;
        (session.user as any).id = token.id as string;
        (session.user as any).institution_id = token.institution_id as string | null;
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = cookies();
          if (cookieStore.get("dece_demo_institution")?.value === "demo-los-alamos") {
            (session.user as any).real_institution_id = token.institution_id;
            (session.user as any).institution_id = "demo-los-alamos";
            (session.user as any).is_demo_mode = true;
          }
        } catch {
          // Fuera de contexto de petición
        }
      }
      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
};
