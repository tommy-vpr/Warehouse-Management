import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Get order details for packing
    const order = await prisma.order.findUnique({
      where: { id },
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
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PICKED") {
      return NextResponse.json(
        { error: "Order must be picked before packing" },
        { status: 400 }
      );
    }

    // Calculate total weight in grams, then convert to ounces and pounds
    const totalWeightGrams = order.items.reduce((sum, item) => {
      // Use unit weight (not master case weight)
      const unitWeightGrams = item.productVariant.weight
        ? parseFloat(item.productVariant.weight.toString())
        : 94; // Default ~3.3 oz if no weight
      return sum + unitWeightGrams * item.quantity;
    }, 0);

    // Convert grams to ounces (1 gram = 0.035274 oz)
    const totalWeightOz = totalWeightGrams * 0.035274;

    // Convert grams to pounds (1 gram = 0.00220462 lbs)
    const totalWeightLbs = totalWeightGrams * 0.00220462;

    const totalVolume = order.items.reduce((sum, item) => {
      const dims = item.productVariant.dimensions as any;

      // Handle dimensions properly - check if it's the unit dimensions or master case
      let volume = 100; // default cubic inches for small item

      if (dims) {
        // Assuming dimensions are for a single unit in inches
        // Format: { length: X, width: Y, height: Z, unit: "in" }
        if (dims.length && dims.width && dims.height) {
          volume = dims.length * dims.width * dims.height;
        }
      }

      return sum + volume * item.quantity;
    }, 0);

    // Suggest box size based on volume (cubic inches)
    let suggestedBox = "SMALL";
    if (totalVolume > 1000) suggestedBox = "LARGE";
    else if (totalVolume > 500) suggestedBox = "MEDIUM";

    const shippingAddr = order.shippingAddress as any;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        shippingAddress: shippingAddr,
        billingAddress: order.billingAddress,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productVariant.product.name,
          sku: item.productVariant.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          // Return weight in grams for individual unit
          weightGrams: item.productVariant.weight
            ? parseFloat(item.productVariant.weight.toString())
            : 94,
          weightOz: item.productVariant.weight
            ? parseFloat(item.productVariant.weight.toString()) * 0.035274
            : 3.31,
          dimensions: item.productVariant.dimensions,
        })),
      },
      packingInfo: {
        totalWeightGrams: Math.round(totalWeightGrams * 100) / 100,
        totalWeightOz: Math.round(totalWeightOz * 100) / 100,
        totalWeightLbs: Math.round(totalWeightLbs * 100) / 100,
        totalVolume: Math.round(totalVolume),
        suggestedBox,
        // Estimate based on ounces (more appropriate for small packages)
        estimatedShippingCost: Math.round(totalWeightOz * 0.15 * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching order for packing:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}
