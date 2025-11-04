import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const sku = searchParams.get("sku"); // New: SKU filter parameter

    // ========================================
    // SKU FILTERING MODE
    // ========================================
    if (sku) {
      console.log("📍 Fetching locations for SKU:", sku);

      // Find the product variant by SKU or UPC
      const variant = await prisma.productVariant.findFirst({
        where: {
          OR: [{ sku }, { upc: sku }],
        },
      });

      if (!variant) {
        console.log("⚠️ Product variant not found for SKU:", sku);
        return NextResponse.json([]);
      }

      // Find all inventory records for this variant that have quantity > 0
      const inventoryRecords = await prisma.inventory.findMany({
        where: {
          productVariantId: variant.id,
          quantityOnHand: {
            gt: 0, // Only locations with stock
          },
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              barcode: true,
              aisle: true,
              shelf: true,
              bin: true,
              zone: true,
              isPickable: true,
              isReceivable: true,
            },
          },
        },
        orderBy: {
          quantityOnHand: "desc", // Order by quantity, highest first
        },
      });

      // Extract unique locations with quantity info
      const locations = inventoryRecords.map((inv) => ({
        ...inv.location,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
        quantityAvailable: Math.max(
          0,
          inv.quantityOnHand - inv.quantityReserved
        ),
      }));

      console.log(
        `✅ Found ${locations.length} active locations with inventory for SKU ${sku}`
      );

      return NextResponse.json(locations);
    }

    // ========================================
    // STANDARD MODE (All Locations)
    // ========================================
    const locations = await prisma.location.findMany({
      where: type
        ? {
            // Add type filter if your schema has it
            // type: { in: type.split(',') }
          }
        : {},
      include: {
        inventory: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Add calculated totals for each location
    const locationsWithTotals = locations.map((location) => {
      const totalItems = location.inventory.length;
      const totalQuantity = location.inventory.reduce(
        (sum, inv) => sum + inv.quantityOnHand,
        0
      );
      const totalReserved = location.inventory.reduce(
        (sum, inv) => sum + inv.quantityReserved,
        0
      );
      const totalAvailable = totalQuantity - totalReserved;

      return {
        ...location,
        totalItems,
        totalQuantity,
        totalReserved,
        totalAvailable,
        inventory: location.inventory.map((inv) => ({
          ...inv,
          quantityAvailable: Math.max(
            0,
            inv.quantityOnHand - inv.quantityReserved
          ),
        })),
      };
    });

    return NextResponse.json(locationsWithTotals);
  } catch (error) {
    console.error("Error fetching locations:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch locations";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, zone, aisle, shelf, bin, isPickable, isReceivable } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        name,
        zone,
        aisle,
        shelf,
        bin,
        isPickable: isPickable ?? true,
        isReceivable: isReceivable ?? true,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error creating location:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create location";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const type = searchParams.get("type");

//     const locations = await prisma.location.findMany({
//       where: type
//         ? {
//             // Note: Your current schema doesn't have 'type' field
//             // Remove this filter or add LocationType enum to your schema
//           }
//         : {},
//       include: {
//         inventory: {
//           include: {
//             productVariant: {
//               include: {
//                 product: true,
//               },
//             },
//           },
//         },
//       },
//       orderBy: {
//         name: "asc",
//       },
//     });

//     // Add calculated totals for each location
//     const locationsWithTotals = locations.map((location) => {
//       const totalItems = location.inventory.length;
//       const totalQuantity = location.inventory.reduce(
//         (sum, inv) => sum + inv.quantityOnHand,
//         0
//       );
//       const totalReserved = location.inventory.reduce(
//         (sum, inv) => sum + inv.quantityReserved,
//         0
//       );
//       const totalAvailable = totalQuantity - totalReserved;

//       return {
//         ...location,
//         totalItems,
//         totalQuantity,
//         totalReserved,
//         totalAvailable,
//         inventory: location.inventory.map((inv) => ({
//           ...inv,
//           quantityAvailable: Math.max(
//             0,
//             inv.quantityOnHand - inv.quantityReserved
//           ),
//         })),
//       };
//     });

//     return NextResponse.json(locationsWithTotals);
//   } catch (error) {
//     console.error("Error fetching locations:", error);

//     const errorMessage =
//       error instanceof Error ? error.message : "Failed to fetch locations";

//     return NextResponse.json({ error: errorMessage }, { status: 500 });
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await request.json();
//     const { name, zone, aisle, shelf, bin, isPickable, isReceivable } = body;

//     if (!name) {
//       return NextResponse.json(
//         { error: "Location name is required" },
//         { status: 400 }
//       );
//     }

//     const location = await prisma.location.create({
//       data: {
//         name,
//         zone,
//         aisle,
//         shelf,
//         bin,
//         isPickable: isPickable ?? true,
//         isReceivable: isReceivable ?? true,
//       },
//     });

//     return NextResponse.json(location);
//   } catch (error) {
//     console.error("Error creating location:", error);

//     const errorMessage =
//       error instanceof Error ? error.message : "Failed to create location";

//     return NextResponse.json({ error: errorMessage }, { status: 500 });
//   }
// }
