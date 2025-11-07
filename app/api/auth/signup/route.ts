// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import {
  signupRateLimit,
  getIdentifier,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // ✅ Rate limit check
    const identifier = getIdentifier(req);
    const { success, limit, remaining, reset } = await signupRateLimit.limit(
      identifier
    );

    if (!success) {
      return rateLimitResponse(success, limit, remaining, reset);
    }

    const { email, password, name } = await req.json();

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        verificationToken: token,
        tokenExpires: expires,
        emailVerified: null,
      },
    });

    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
    await sendVerificationEmail(
      user.email,
      user.name || "User",
      verificationUrl
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created! Please check your email to verify your account.",
      },
      {
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
