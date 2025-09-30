// app/api/inventory/create/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ⚡ You might want to configure a default "RECEIVING" location in your DB
// so new items always have somewhere to live.
const DEFAULT_LOCATION_NAME = "RECEIVING";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1. Find or create the base Product
    const product = await prisma.product.upsert({
      where: { sku: data.sku }, // if SKU is unique at product level
      update: {}, // nothing to update on existing base product
      create: {
        sku: data.sku,
        name: data.name,
        brand: data.brand ?? null,
        category: data.category ?? null,
        productLine: data.productLine ?? null,
        flavor: data.flavor ?? null,
      },
    });

    // 2. Create ProductVariant
    const newVariant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: data.sku,
        upc: data.upc ?? null,
        name: data.name,
        category: data.category ?? null,
        supplier: data.supplier ?? null,
        costPrice: data.costPrice ? new Prisma.Decimal(data.costPrice) : null,
        sellingPrice: data.sellingPrice
          ? new Prisma.Decimal(data.sellingPrice)
          : null,
        weight: data.weight ? new Prisma.Decimal(data.weight) : null,
        volume: data.volume ?? null,
        strength: data.strength ?? null,
        masterCaseQty: data.masterCaseQty
          ? parseInt(data.masterCaseQty, 10)
          : null,
        hasIce: data.hasIce ?? false,
        hasSalt: data.hasSalt ?? false,
        isNicotineFree: data.isNicotineFree ?? false,
        flavor: data.flavor ?? null,
        productLine: data.productLine ?? null,
      },
    });

    // 3. Find or create default location
    // inside POST
    const locationId = data.locationId;

    // if none provided, fallback to default
    let location = null;
    if (locationId) {
      location = await prisma.location.findUnique({
        where: { id: locationId },
      });
    }
    if (!location) {
      location = await prisma.location.upsert({
        where: { name: "RECEIVING" },
        update: {},
        create: { name: "RECEIVING", type: "RECEIVING" },
      });
    }

    // 4. Create Inventory record
    const inventory = await prisma.inventory.create({
      data: {
        productVariantId: newVariant.id,
        locationId: location.id,
        quantityOnHand: data.quantityOnHand
          ? parseInt(data.quantityOnHand, 10)
          : 0,
        reorderPoint: data.reorderPoint ? parseInt(data.reorderPoint, 10) : 0,
        maxQuantity: data.maxQuantity ? parseInt(data.maxQuantity, 10) : null,
      },
    });

    return NextResponse.json({ success: true, product, newVariant, inventory });
  } catch (err: any) {
    console.error("Error creating inventory item:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
