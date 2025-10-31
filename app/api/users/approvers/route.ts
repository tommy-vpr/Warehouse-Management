// app/api/users/approvers/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch users with ADMIN or MANAGER roles
    const approvers = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "MANAGER"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      approvers,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch approvers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch approvers" },
      { status: 500 }
    );
  }
}
