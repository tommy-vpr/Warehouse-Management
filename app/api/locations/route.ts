// app/api/locations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations);
  } catch (err: any) {
    console.error("Error fetching locations:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
