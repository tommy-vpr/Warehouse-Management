// app/api/inventory-planner/sync-inventory/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

async function fetchAllIPVariants() {
  const allVariants = [];
  let page = 0;
  const limit = 1000;

  while (true) {
    const url = new URL(`${API_URL}/variants`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("page", String(page));
    url.searchParams.set("fields", "id,sku,in_stock");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: API_KEY,
        Account: ACCOUNT_ID,
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`IP API error: ${response.status}`);

    const data = await response.json();
    const variants = data.variants || [];
    allVariants.push(...variants);

    if (variants.length < limit) break;
    page++;
  }

  return allVariants;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN or MANAGER can sync
    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(`🔄 Manual sync triggered by: ${session.user.email}`);

    const ipVariants = await fetchAllIPVariants();
    const ipStockMap = new Map(
      ipVariants.map((v: any) => [v.sku, v.in_stock || 0])
    );

    const inventoryRecords = await prisma.inventory.findMany({
      include: {
        productVariant: { select: { sku: true } },
      },
    });

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;

    for (const inventory of inventoryRecords) {
      const sku = inventory.productVariant.sku;
      const ipStock = ipStockMap.get(sku);

      if (ipStock === undefined) {
        notFound++;
        continue;
      }

      if (inventory.quantityOnHand === ipStock) {
        unchanged++;
        continue;
      }

      await prisma.inventory.update({
        where: { id: inventory.id },
        data: { quantityOnHand: ipStock },
      });

      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      unchanged,
      notFound,
      totalIPVariants: ipVariants.length,
      totalWMSInventory: inventoryRecords.length,
    });
  } catch (error: any) {
    console.error("❌ Sync failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
