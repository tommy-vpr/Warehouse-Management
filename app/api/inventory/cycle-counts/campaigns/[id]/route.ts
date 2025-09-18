// app/api/inventory/cycle-counts/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaignId = params.id;

    // Get campaign with all tasks and related data
    const campaign = await prisma.cycleCountCampaign.findUnique({
      where: { id: campaignId },
      include: {
        tasks: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                zone: true,
                aisle: true,
                shelf: true,
                bin: true,
              },
            },
            productVariant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}
