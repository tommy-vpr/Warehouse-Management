import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { runAt: "desc" },
      take: 50, // Last 50 sync logs
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
