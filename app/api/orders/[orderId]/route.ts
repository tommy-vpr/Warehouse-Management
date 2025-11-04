import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

// Helper function to determine next actions based on order status
function getNextActions(order: any) {
  const actions: Array<{
    action: string;
    label: string;
    variant: "default" | "outline" | "destructive";
  }> = [];

  switch (order.status) {
    case OrderStatus.PENDING:
      actions.push({
        action: "ALLOCATE",
        label: "Allocate Inventory",
        variant: "default",
      });
      break;

    case OrderStatus.ALLOCATED:
      actions.push({
        action: "GENERATE_SINGLE_PICK",
        label: "Generate Pick List",
        variant: "default",
      });
      break;

    case OrderStatus.PICKING:
      if (order.pickListItems?.[0]) {
        actions.push({
          action: "VIEW_PICK_PROGRESS",
          label: "View Pick Progress",
          variant: "outline",
        });
        actions.push({
          action: "MOBILE_PICK",
          label: "Mobile Pick",
          variant: "outline",
        });
        actions.push({
          action: "PAUSE_PICKING",
          label: "Pause Picking",
          variant: "outline",
        });
        actions.push({
          action: "COMPLETE_PICKING",
          label: "Complete Picking",
          variant: "default",
        });
      }
      break;

    case OrderStatus.PICKED:
      actions.push({
        action: "PACK_ORDER",
        label: "Pack Order",
        variant: "default",
      });
      break;

    case OrderStatus.PACKED:
      actions.push({
        action: "CREATE_LABEL",
        label: "Create Shipping Label",
        variant: "default",
      });
      actions.push({
        action: "SPLIT_ORDER",
        label: "Split Shipment",
        variant: "outline",
      });
      break;

    case OrderStatus.SHIPPED:
      actions.push({
        action: "VIEW_TRACKING",
        label: "View Tracking",
        variant: "outline",
      });
      actions.push({
        action: "MARK_FULFILLED",
        label: "Mark as Fulfilled",
        variant: "default",
      });
      break;

    case OrderStatus.FULFILLED:
    case OrderStatus.DELIVERED:
      actions.push({
        action: "VIEW_TRACKING",
        label: "View Tracking",
        variant: "outline",
      });
      break;

    case OrderStatus.PARTIALLY_PICKED:
      actions.push({
        action: "VIEW_PICK_PROGRESS",
        label: "View Pick Progress",
        variant: "outline",
      });
      actions.push({
        action: "COMPLETE_PICKING",
        label: "Complete Picking",
        variant: "default",
      });
      break;

    case OrderStatus.PARTIALLY_SHIPPED:
      actions.push({
        action: "VIEW_TRACKING",
        label: "View Tracking",
        variant: "outline",
      });
      actions.push({
        action: "CREATE_LABEL",
        label: "Create Remaining Label",
        variant: "default",
      });
      break;
  }

  return actions;
}

// Helper function to determine priority based on order characteristics
function calculatePriority(order: any): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  const totalAmount = parseFloat(order.totalAmount.toString());
  const hoursSinceCreated =
    (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);

  // Urgent: High value orders older than 24 hours OR backorders
  if ((totalAmount > 500 && hoursSinceCreated > 24) || order.hasBackOrders)
    return "URGENT";

  // High: Orders older than 48 hours or high value
  if (hoursSinceCreated > 48 || totalAmount > 1000) return "HIGH";

  // Medium: Orders older than 24 hours
  if (hoursSinceCreated > 24) return "MEDIUM";

  return "LOW";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        pickListItems: {
          include: {
            pickList: {
              include: {
                assignedUser: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            location: true,
          },
        },
        statusHistory: {
          include: {
            changedByUser: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changedAt: "desc",
          },
        },
        backOrders: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        packages: {
          include: {
            items: true, // ✅ ADD THIS
          },
        },
        images: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Parse shipping address (stored as Json in schema)
    const shippingAddress =
      typeof order.shippingAddress === "string"
        ? JSON.parse(order.shippingAddress)
        : order.shippingAddress;

    // Parse billing address if exists (stored as Json? in schema)
    const billingAddress = order.billingAddress
      ? typeof order.billingAddress === "string"
        ? JSON.parse(order.billingAddress)
        : order.billingAddress
      : null;

    // Get pick list info from the first pick list item (if exists)
    const pickListInfo = order.pickListItems[0]?.pickList
      ? {
          pickListId: order.pickListItems[0].pickList.id,
          batchNumber: order.pickListItems[0].pickList.batchNumber,
          pickStatus: order.pickListItems[0].pickList.status,
          assignedTo:
            order.pickListItems[0].pickList.assignedUser?.name || null,
          startTime:
            order.pickListItems[0].pickList.startTime?.toISOString() || null,
        }
      : undefined;

    // Calculate total weight from items (weight is Decimal? in grams)
    const totalWeight = order.items.reduce((sum, item) => {
      const weight = item.productVariant.weight
        ? parseFloat(item.productVariant.weight.toString())
        : 0;
      return sum + weight * item.quantity;
    }, 0);

    // Format order items
    const formattedItems = order.items.map((item) => ({
      id: item.id,
      productName: item.productVariant.name,
      sku: item.productVariant.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
    }));

    // Format status history
    const formattedHistory = order.statusHistory.map((history) => ({
      id: history.id,
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      changedBy: history.changedByUser?.name || "System",
      changedAt: history.changedAt.toISOString(),
      notes: history.notes,
    }));

    // Format back orders
    const formattedBackOrders = order.backOrders.map((backOrder) => ({
      id: backOrder.id,
      productVariantId: backOrder.productVariantId,
      productName: backOrder.productVariant.name,
      sku: backOrder.productVariant.sku,
      quantityBackOrdered: backOrder.quantityBackOrdered,
      quantityFulfilled: backOrder.quantityFulfilled,
      status: backOrder.status,
      reason: backOrder.reason,
      createdAt: backOrder.createdAt.toISOString(),
    }));

    // Format shipping packages
    const formattedShippingPackages = order.packages.map((pkg) => ({
      id: pkg.id,
      trackingNumber: pkg.trackingNumber,
      labelUrl: pkg.labelUrl,
      packingSlipUrl: pkg.packingSlipUrl,
      cost: pkg.cost.toString(),
      carrierCode: pkg.carrierCode,
      serviceCode: pkg.serviceCode,
      packageCode: pkg.packageCode, // Packing slip
      packageNumber: pkg.packageNumber, // Packing slip
      totalPackages: pkg.totalPackages, // Packing slip
      weight: pkg.weight ? pkg.weight.toString() : "0",
      dimensions: pkg.dimensions, // This is already Json type
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(), // Packing slip
      items: pkg.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
    }));

    const formattedImages = order.images.map((img) => ({
      id: img.id,
      url: img.url,
      reference: img.reference,
      createdAt: img.createdAt.toISOString(),
    }));

    // Calculate priority
    const priority = calculatePriority(order);

    // Get next actions
    const nextActions = getNextActions({
      ...order,
      pickListItems: order.pickListItems,
    });

    // Build response
    const response = {
      id: order.id,
      orderNumber: order.orderNumber,
      shopifyOrderId: order.shopifyOrderId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      itemCount: order.items.length,
      totalWeight: totalWeight,
      priority: priority,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      shippedAt: order.shippedAt?.toISOString() || null,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      shippingCarrier: order.shippingCarrier,
      shippingService: order.shippingService,
      shippingCost: order.shippingCost,
      labelUrl: order.labelUrl,
      notes: order.notes,
      pickListInfo: pickListInfo,
      items: formattedItems,
      nextActions: nextActions,
      statusHistory: formattedHistory,
      backOrders: formattedBackOrders,
      shippingPackages: formattedShippingPackages, // Backorder shipment
      images: formattedImages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch order";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
