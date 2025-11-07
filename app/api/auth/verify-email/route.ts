// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  emailVerificationRateLimit,
  getIdentifier,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // ✅ Rate limit check
    const identifier = getIdentifier(req);
    const { success, limit, remaining, reset } =
      await emailVerificationRateLimit.limit(identifier);

    if (!success) {
      return rateLimitResponse(success, limit, remaining, reset);
    }

    const { token } = await req.json();

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        tokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        tokenExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
