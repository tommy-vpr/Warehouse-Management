import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const types = ["forecast", "purchase_order"];
  const results: Record<string, any> = {};

  for (const type of types) {
    const last = await prisma.syncLog.findFirst({
      where: { type },
      orderBy: { runAt: "desc" },
    });
    results[type] = last || null;
  }

  return NextResponse.json(results);
}
