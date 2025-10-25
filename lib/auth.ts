import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";

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
    // Password-based authentication
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          return null;
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
          image: user.image, // ✅ ADD THIS
        };
      },
    }),
    // Demo provider for development
    CredentialsProvider({
      id: "demo",
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (user && credentials.email === "demo@wms.com") {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image, // ✅ ADD THIS
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token, trigger }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;

        // ✅ ADD THIS: Fetch fresh data on update or initial load
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            image: true, // ✅ Include image
            name: true, // ✅ Include name for updates
          },
        });

        if (user) {
          session.user.role = user.role;
          session.user.image = user.image; // ✅ Add image to session
          session.user.name = user.name; // ✅ Update name if changed
        }
      }
      return session;
    },
    jwt: async ({ user, token, trigger }) => {
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role;
        token.image = (user as any).image; // ✅ ADD THIS
      }

      // ✅ ADD THIS: Handle session updates (when updateSession() is called)
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

// import { NextAuthOptions } from "next-auth";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import EmailProvider from "next-auth/providers/email";
// import CredentialsProvider from "next-auth/providers/credentials";
// import { prisma } from "./prisma";
// import { compare } from "bcryptjs";

// export const authOptions: NextAuthOptions = {
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     EmailProvider({
//       server: {
//         host: process.env.EMAIL_SERVER_HOST,
//         port: Number(process.env.EMAIL_SERVER_PORT),
//         auth: {
//           user: process.env.EMAIL_SERVER_USER,
//           pass: process.env.EMAIL_SERVER_PASSWORD,
//         },
//       },
//       from: process.env.EMAIL_FROM,
//     }),
//     // Password-based authentication
//     CredentialsProvider({
//       id: "credentials",
//       name: "Password",
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email.toLowerCase() },
//         });

//         if (!user || !user.password) {
//           return null;
//         }

//         const isPasswordValid = await compare(
//           credentials.password,
//           user.password
//         );

//         if (!isPasswordValid) {
//           return null;
//         }

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           role: user.role,
//         };
//       },
//     }),
//     // Demo provider for development
//     CredentialsProvider({
//       id: "demo",
//       name: "Demo",
//       credentials: {
//         email: { label: "Email", type: "email" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email) return null;

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (user && credentials.email === "demo@wms.com") {
//           return {
//             id: user.id,
//             email: user.email,
//             name: user.name,
//             role: user.role,
//           };
//         }
//         return null;
//       },
//     }),
//   ],
//   callbacks: {
//     session: async ({ session, token }) => {
//       if (session?.user && token?.sub) {
//         session.user.id = token.sub;
//         const user = await prisma.user.findUnique({
//           where: { id: token.sub },
//           select: { role: true },
//         });
//         if (user) {
//           session.user.role = user.role;
//         }
//       }
//       return session;
//     },
//     jwt: async ({ user, token }) => {
//       if (user) {
//         token.uid = user.id;
//         token.role = (user as any).role;
//       }
//       return token;
//     },
//   },
//   session: {
//     strategy: "jwt",
//   },
//   pages: {
//     signIn: "/",
//   },
// };
