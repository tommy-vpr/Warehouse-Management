import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Create or find demo user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Demo User",
          email,
          role: "ADMIN", // Give demo user admin access
          emailVerified: new Date(), // Mark as verified
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Demo user ready. Use regular sign-in now.",
      userId: user.id,
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json({ error: "Demo login failed" }, { status: 500 });
  }
}
