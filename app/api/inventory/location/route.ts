// app/api/inventory/locations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const zone = searchParams.get("zone");
    const type = searchParams.get("type");
    const isReceivable = searchParams.get("receivable");
    const isPickable = searchParams.get("pickable");

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { zone: { contains: search, mode: "insensitive" } },
        { aisle: { contains: search, mode: "insensitive" } },
      ];
    }

    if (zone && zone !== "ALL") {
      where.zone = zone;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (isReceivable === "true") {
      where.isReceivable = true;
    }

    if (isPickable === "true") {
      where.isPickable = true;
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: [
        { zone: "asc" },
        { aisle: "asc" },
        { shelf: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        zone: true,
        aisle: true,
        shelf: true,
        bin: true,
        isPickable: true,
        isReceivable: true,
        barcode: true,
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
