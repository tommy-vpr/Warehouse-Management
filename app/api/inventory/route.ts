// app/api/inventory/route.ts
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
    const location = searchParams.get("location");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      ...(search && {
        OR: [
          {
            productVariant: { sku: { contains: search, mode: "insensitive" } },
          },
          {
            productVariant: { upc: { contains: search, mode: "insensitive" } },
          },
          {
            productVariant: {
              product: { name: { contains: search, mode: "insensitive" } },
            },
          },
        ],
      }),
      ...(location !== "ALL" &&
        location && {
          location: { zone: location },
        }),
    };

    // Fetch ALL matching inventory records (no skip/take yet)
    const inventoryRecords = await prisma.inventory.findMany({
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        location: true,
      },
      where: whereClause,
    });

    // Group by product variant and aggregate locations
    const groupedInventory = inventoryRecords.reduce((acc, record) => {
      const key = record.productVariantId;

      if (!acc[key]) {
        acc[key] = {
          inventoryId: record.id,
          productVariantId: record.productVariantId,
          productName: record.productVariant.name,
          sku: record.productVariant.sku,
          upc: record.productVariant.upc,
          costPrice: record.productVariant.costPrice?.toString(),
          sellingPrice: record.productVariant.sellingPrice?.toString(),
          weight: record.productVariant.weight?.toNumber(),
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          reorderPoint: record.reorderPoint,
          maxQuantity: record.maxQuantity,
          locations: [],
          lastCounted: record.lastCounted,
          updatedAt: record.updatedAt,
          category: "GENERAL",
          supplier: "Unknown",
        };
      }

      // Aggregate quantities from ALL locations
      acc[key].quantityOnHand += record.quantityOnHand;
      acc[key].quantityReserved += record.quantityReserved;
      acc[key].quantityAvailable =
        acc[key].quantityOnHand - acc[key].quantityReserved;

      // Add location info
      acc[key].locations.push({
        inventoryId: record.id,
        locationId: record.locationId,
        locationName: record.location.name,
        quantity: record.quantityOnHand,
        zone: record.location.zone,
        aisle: record.location.aisle,
        shelf: record.location.shelf,
      });

      // Use most recent lastCounted
      if (
        record.lastCounted &&
        (!acc[key].lastCounted || record.lastCounted > acc[key].lastCounted)
      ) {
        acc[key].lastCounted = record.lastCounted;
      }

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate reorder status
    let inventory = Object.values(groupedInventory).map((item: any) => {
      let reorderStatus = "OK";

      // LOW STOCK CALCULATION:
      // 1. CRITICAL: quantityAvailable <= 0 (out of stock)
      // 2. LOW: quantityAvailable <= reorderPoint (if reorderPoint is set)
      // 3. OVERSTOCK: quantityOnHand >= maxQuantity (if maxQuantity is set)
      // 4. OK: everything else

      if (item.quantityAvailable <= 0) {
        reorderStatus = "CRITICAL";
      } else if (
        item.reorderPoint &&
        item.quantityAvailable <= item.reorderPoint
      ) {
        reorderStatus = "LOW";
      } else if (item.maxQuantity && item.quantityOnHand >= item.maxQuantity) {
        reorderStatus = "OVERSTOCK";
      }

      return {
        ...item,
        lastCounted: item.lastCounted?.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        reorderStatus,
      };
    });

    // Check for existing reorder requests
    const variantIds = inventory.map((item) => item.productVariantId);

    const reorderRequests = await prisma.inventoryTransaction.findMany({
      where: {
        productVariantId: { in: variantIds },
        referenceType: "REORDER_REQUEST",
      },
      select: { productVariantId: true },
    });

    const reorderRequestSet = new Set(
      reorderRequests.map((req) => req.productVariantId)
    );

    // Apply status filter
    if (status && status !== "ALL") {
      inventory = inventory.filter((item) => item.reorderStatus === status);
    }

    inventory = inventory.map((item) => ({
      ...item,
      hasReorderRequest: reorderRequestSet.has(item.productVariantId),
    }));

    // ✅ UPDATED SORTING: Alphabetical descending (Z to A)
    inventory.sort((a, b) => {
      // Primary sort: Alphabetical DESCENDING (Z → A)
      return a.productName.localeCompare(b.productName);
    });

    // NOW apply pagination to grouped results
    const totalCount = inventory.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedInventory = inventory.slice(skip, skip + limit);

    // Calculate statistics
    const stats = {
      totalProducts: inventory.length,
      totalValue: inventory.reduce((sum, item) => {
        const cost = parseFloat(item.costPrice || "0");
        return sum + cost * item.quantityOnHand;
      }, 0),
      lowStock: inventory.filter((item) => item.reorderStatus === "LOW").length,
      outOfStock: inventory.filter((item) => item.reorderStatus === "CRITICAL")
        .length,
      overstock: inventory.filter((item) => item.reorderStatus === "OVERSTOCK")
        .length,
      recentTransactions: await prisma.inventoryTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    };

    return NextResponse.json({
      inventory: paginatedInventory,
      stats,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

// // app/api/inventory/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const search = searchParams.get("search");
//     const location = searchParams.get("location");
//     const status = searchParams.get("status");
//     const category = searchParams.get("category");

//     // Pagination params
//     const page = parseInt(searchParams.get("page") || "1");
//     const limit = parseInt(searchParams.get("limit") || "20");
//     const skip = (page - 1) * limit;

//     // Build where clause
//     const whereClause: any = {
//       ...(search && {
//         OR: [
//           {
//             productVariant: { sku: { contains: search, mode: "insensitive" } },
//           },
//           {
//             productVariant: { upc: { contains: search, mode: "insensitive" } },
//           },
//           {
//             productVariant: {
//               product: { name: { contains: search, mode: "insensitive" } },
//             },
//           },
//         ],
//       }),
//       ...(location !== "ALL" &&
//         location && {
//           location: { zone: location },
//         }),
//     };

//     // Fetch ALL matching inventory records (no skip/take yet)
//     const inventoryRecords = await prisma.inventory.findMany({
//       include: {
//         productVariant: {
//           include: {
//             product: true,
//           },
//         },
//         location: true,
//       },
//       where: whereClause,
//     });

//     // Group by product variant and aggregate locations
//     const groupedInventory = inventoryRecords.reduce((acc, record) => {
//       const key = record.productVariantId;

//       if (!acc[key]) {
//         acc[key] = {
//           inventoryId: record.id, // Use productVariantId as key
//           productVariantId: record.productVariantId,
//           productName: record.productVariant.name,
//           sku: record.productVariant.sku,
//           upc: record.productVariant.upc,
//           costPrice: record.productVariant.costPrice?.toString(),
//           sellingPrice: record.productVariant.sellingPrice?.toString(),
//           weight: record.productVariant.weight?.toNumber(),
//           quantityOnHand: 0,
//           quantityReserved: 0,
//           quantityAvailable: 0,
//           reorderPoint: record.reorderPoint,
//           maxQuantity: record.maxQuantity,
//           locations: [],
//           lastCounted: record.lastCounted,
//           updatedAt: record.updatedAt,
//           category: "GENERAL",
//           supplier: "Unknown",
//         };
//       }

//       // Aggregate quantities from ALL locations
//       acc[key].quantityOnHand += record.quantityOnHand;
//       acc[key].quantityReserved += record.quantityReserved;
//       acc[key].quantityAvailable =
//         acc[key].quantityOnHand - acc[key].quantityReserved;

//       // Add location info
//       acc[key].locations.push({
//         inventoryId: record.id,
//         locationId: record.locationId,
//         locationName: record.location.name,
//         quantity: record.quantityOnHand,
//         zone: record.location.zone,
//         aisle: record.location.aisle,
//         shelf: record.location.shelf,
//       });

//       // Use most recent lastCounted
//       if (
//         record.lastCounted &&
//         (!acc[key].lastCounted || record.lastCounted > acc[key].lastCounted)
//       ) {
//         acc[key].lastCounted = record.lastCounted;
//       }

//       return acc;
//     }, {} as Record<string, any>);

//     // Convert to array and calculate reorder status
//     let inventory = Object.values(groupedInventory).map((item: any) => {
//       let reorderStatus = "OK";

//       if (item.quantityAvailable <= 0) {
//         reorderStatus = "CRITICAL";
//       } else if (
//         item.reorderPoint &&
//         item.quantityAvailable <= item.reorderPoint
//       ) {
//         reorderStatus = "LOW";
//       } else if (item.maxQuantity && item.quantityOnHand >= item.maxQuantity) {
//         reorderStatus = "OVERSTOCK";
//       }

//       return {
//         ...item,
//         lastCounted: item.lastCounted?.toISOString(),
//         updatedAt: item.updatedAt.toISOString(),
//         reorderStatus,
//       };
//     });

//     // Check for existing reorder requests
//     const variantIds = inventory.map((item) => item.productVariantId);

//     const reorderRequests = await prisma.inventoryTransaction.findMany({
//       where: {
//         productVariantId: { in: variantIds },
//         referenceType: "REORDER_REQUEST",
//       },
//       select: { productVariantId: true },
//     });

//     const reorderRequestSet = new Set(
//       reorderRequests.map((req) => req.productVariantId)
//     );

//     // Apply status filter
//     if (status && status !== "ALL") {
//       inventory = inventory.filter((item) => item.reorderStatus === status);
//     }

//     inventory = inventory.map((item) => ({
//       ...item,
//       hasReorderRequest: reorderRequestSet.has(item.productVariantId),
//     }));

//     inventory.sort((a, b) => {
//       // Sort by stock status priority first (CRITICAL > LOW > OK > OVERSTOCK)
//       const statusPriority: Record<string, number> = {
//         OK: 0,
//         OVERSTOCK: 1,
//         LOW: 2,
//         CRITICAL: 3,
//       };

//       const statusDiff =
//         statusPriority[a.reorderStatus] - statusPriority[b.reorderStatus];
//       if (statusDiff !== 0) return statusDiff;

//       // Then sort by available quantity (lowest first)
//       const qtyDiff = a.quantityAvailable - b.quantityAvailable;
//       if (qtyDiff !== 0) return qtyDiff;

//       // Finally sort alphabetically by name
//       return a.productName.localeCompare(b.productName);
//     });

//     // NOW apply pagination to grouped results
//     const totalCount = inventory.length;
//     const totalPages = Math.ceil(totalCount / limit);
//     const paginatedInventory = inventory.slice(skip, skip + limit);

//     // Calculate statistics
//     const stats = {
//       totalProducts: inventory.length,
//       totalValue: inventory.reduce((sum, item) => {
//         const cost = parseFloat(item.costPrice || "0");
//         return sum + cost * item.quantityOnHand;
//       }, 0),
//       lowStock: inventory.filter((item) => item.reorderStatus === "LOW").length,
//       outOfStock: inventory.filter((item) => item.reorderStatus === "CRITICAL")
//         .length,
//       overstock: inventory.filter((item) => item.reorderStatus === "OVERSTOCK")
//         .length,
//       recentTransactions: await prisma.inventoryTransaction.count({
//         where: {
//           createdAt: {
//             gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
//           },
//         },
//       }),
//     };

//     return NextResponse.json({
//       inventory: paginatedInventory,
//       stats,
//       totalPages,
//       currentPage: page,
//       totalCount,
//     });
//   } catch (error) {
//     console.error("Error fetching inventory:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch inventory" },
//       { status: 500 }
//     );
//   }
// }
