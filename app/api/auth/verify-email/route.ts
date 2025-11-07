// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailVerificationRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // ✅ Rate limit by TOKEN instead of IP
    const { success, limit, remaining, reset } =
      await emailVerificationRateLimit.limit(token);

    if (!success) {
      return NextResponse.json(
        {
          error:
            "Too many verification attempts for this link. Please request a new verification email.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

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

// // app/api/auth/verify-email/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import {
//   emailVerificationRateLimit,
//   getIdentifier,
//   rateLimitResponse,
// } from "@/lib/rate-limit";

// export async function POST(req: Request) {
//   try {
//     // ✅ Rate limit check
//     const identifier = getIdentifier(req);
//     const { success, limit, remaining, reset } =
//       await emailVerificationRateLimit.limit(identifier);

//     if (!success) {
//       return rateLimitResponse(success, limit, remaining, reset);
//     }

//     const { token } = await req.json();

//     const user = await prisma.user.findFirst({
//       where: {
//         verificationToken: token,
//         tokenExpires: {
//           gt: new Date(),
//         },
//       },
//     });

//     if (!user) {
//       return NextResponse.json(
//         { error: "Invalid or expired verification link" },
//         { status: 400 }
//       );
//     }

//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         emailVerified: new Date(),
//         verificationToken: null,
//         tokenExpires: null,
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message: "Email verified successfully",
//     });
//   } catch (error) {
//     console.error("Email verification error:", error);
//     return NextResponse.json(
//       { error: "Failed to verify email" },
//       { status: 500 }
//     );
//   }
// }
