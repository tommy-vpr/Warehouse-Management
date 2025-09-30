// app/api/inventory/actions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, itemId, quantity } = await request.json();

    switch (action) {
      case "ADJUST":
        // Validate quantity
        if (quantity === undefined || quantity === null || quantity === 0) {
          return NextResponse.json(
            { error: "Quantity is required and cannot be zero" },
            { status: 400 }
          );
        }

        // Find the inventory record
        const inventoryRecord = await prisma.inventory.findUnique({
          where: { id: itemId },
          include: { productVariant: true, location: true },
        });

        if (!inventoryRecord) {
          return NextResponse.json(
            { error: "Inventory item not found" },
            { status: 404 }
          );
        }

        // Prevent negative inventory
        const newQuantity = inventoryRecord.quantityOnHand + quantity;
        if (newQuantity < 0) {
          return NextResponse.json(
            {
              error: `Cannot adjust by ${quantity}. Current quantity is ${inventoryRecord.quantityOnHand}. This would result in negative inventory.`,
            },
            { status: 400 }
          );
        }

        // Update inventory
        await prisma.inventory.update({
          where: { id: itemId },
          data: {
            quantityOnHand: newQuantity,
          },
        });

        // Create transaction record with proper type
        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: inventoryRecord.productVariantId,
            locationId: inventoryRecord.locationId,
            transactionType: quantity > 0 ? "RECEIPT" : "ADJUSTMENT", // Receipt for positive, Adjustment for negative
            quantityChange: quantity,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: itemId,
            userId: session.user.id,
            notes: `Manual adjustment: ${
              quantity > 0 ? "+" : ""
            }${quantity} units at ${inventoryRecord.location.name}`,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Inventory adjusted by ${quantity}. New quantity: ${newQuantity}`,
          newQuantity,
        });

      case "REORDER":
        // Get inventory item details for reorder
        const itemToReorder = await prisma.inventory.findUnique({
          where: { id: itemId },
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        });

        if (!itemToReorder) {
          return NextResponse.json(
            { error: "Inventory item not found" },
            { status: 404 }
          );
        }

        // Calculate reorder quantity (could be based on reorder point + safety stock)
        const reorderQty = itemToReorder.reorderPoint || 100; // Default to 100 if no reorder point set

        // Create a purchase order or reorder request
        // For now, create a transaction record as a placeholder
        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: itemToReorder.productVariantId,
            locationId: itemToReorder.locationId,
            transactionType: "ADJUSTMENT", // Could add a REORDER type to your enum
            quantityChange: 0, // No immediate quantity change
            referenceType: "REORDER_REQUEST",
            referenceId: itemId,
            userId: session.user.id,
            notes: `Reorder requested for ${itemToReorder.productVariant.product.name} - SKU: ${itemToReorder.productVariant.sku}. Suggested quantity: ${reorderQty}`,
          },
        });

        // TODO: In production, this would:
        // 1. Create a purchase order
        // 2. Send notification to purchasing team
        // 3. Email supplier
        // 4. Add to reorder queue

        return NextResponse.json({
          success: true,
          message: `Reorder request created for ${itemToReorder.productVariant.sku}`,
          suggestedQuantity: reorderQty,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error performing inventory action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
