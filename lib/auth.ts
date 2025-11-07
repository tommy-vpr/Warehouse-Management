// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { signinRateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { success } = await signinRateLimit.limit(credentials.email);

        if (!success) {
          throw new Error(
            "Too many login attempts. Please try again in 1 minutes."
          );
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
    // ❌ REMOVED: Demo provider
  ],
  callbacks: {
    session: async ({ session, token, trigger }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;

        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            image: true,
            name: true,
          },
        });

        if (user) {
          session.user.role = user.role;
          session.user.image = user.image;
          session.user.name = user.name;
        }
      }
      return session;
    },
    jwt: async ({ user, token, trigger }) => {
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role;
        token.image = (user as any).image;
      }

      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            image: true,
            name: true,
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.image = dbUser.image;
          token.name = dbUser.name;
        }
      }

      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
};
