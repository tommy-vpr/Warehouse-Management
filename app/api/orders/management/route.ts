// app/api/orders/management/route.ts
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
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const priority = searchParams.get("priority");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const whereClause: any = {};

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom) {
      whereClause.createdAt = { gte: new Date(dateFrom) };
    }

    if (dateTo) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: new Date(dateTo),
      };
    }

    const totalCount = await prisma.order.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / limit);

    // Get orders with related data
    const orders = await prisma.order.findMany({
      where: whereClause,
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
              select: {
                id: true,
                batchNumber: true,
                status: true,
                startTime: true,
                pickedItems: true, // ✅ ADD: Number of items picked
                totalItems: true, // ✅ ADD: Total items in pick list
                assignedUser: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
    });

    // Transform orders for management view
    const managementOrders = orders.map((order) => {
      const shippingAddr = order.shippingAddress as any;

      // Calculate order priority
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const hoursOld = orderAge / (1000 * 60 * 60);
      const orderValue = Number(order.totalAmount);

      let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "LOW";
      if (hoursOld > 48 || orderValue > 500) priority = "URGENT";
      else if (hoursOld > 24 || orderValue > 200) priority = "HIGH";
      else if (hoursOld > 12 || orderValue > 100) priority = "MEDIUM";

      // Get the pick list info for this specific order
      const pickListItem = order.pickListItems.find(
        (pli) => pli.orderId === order.id
      );

      // ✅ UPDATED: Include picked items and total items
      const pickListInfo = pickListItem?.pickList
        ? {
            pickListId: pickListItem.pickList.id,
            batchNumber: pickListItem.pickList.batchNumber,
            pickStatus: pickListItem.pickList.status,
            assignedTo: pickListItem.pickList.assignedUser?.name,
            startTime: pickListItem.pickList.startTime,
            pickedItems: pickListItem.pickList.pickedItems || 0,
            totalItems: pickListItem.pickList.totalItems || 0,
            hasStarted:
              !!pickListItem.pickList.startTime ||
              (pickListItem.pickList.pickedItems || 0) > 0,
          }
        : null;

      // ✅ UPDATED: Determine next actions with smart button labels
      const getNextActions = (
        status: string,
        pickInfo: typeof pickListInfo
      ) => {
        switch (status) {
          case "PENDING":
            return [
              {
                action: "ALLOCATE",
                label: "Allocate Inventory",
                variant: "default",
              },
            ];
          case "ALLOCATED":
            return [
              {
                action: "GENERATE_SINGLE_PICK",
                label: "Generate Pick List",
                variant: "default",
              },
              {
                action: "VIEW_DETAILS",
                label: "View Details",
                variant: "outline",
              },
            ];
          case "PICKING":
            const hasStarted = pickInfo?.hasStarted || false;
            return [
              {
                action: "VIEW_PICK_PROGRESS",
                label: "View Progress",
                variant: "default",
              },
              {
                action: "MOBILE_PICK",
                label: hasStarted ? "Continue Picking" : "Start Picking",
                variant: "outline",
              },
            ];
          case "PICKED":
            return [
              { action: "PACK_ORDER", label: "Pack Order", variant: "default" },
              {
                action: "VIEW_DETAILS",
                label: "View Details",
                variant: "outline",
              },
            ];
          case "PACKED":
            return [
              {
                action: "CREATE_LABEL",
                label: "Create Shipping Label",
                variant: "default",
              },
              {
                action: "VIEW_DETAILS",
                label: "View Details",
                variant: "outline",
              },
            ];
          case "SHIPPED":
            return [
              {
                action: "MARK_FULFILLED",
                label: "Mark Fulfilled",
                variant: "default",
              },
              {
                action: "VIEW_TRACKING",
                label: "View Tracking",
                variant: "outline",
              },
            ];
          case "DELIVERED":
          case "FULFILLED":
            return [
              {
                action: "VIEW_DETAILS",
                label: "View Details",
                variant: "outline",
              },
            ];
          default:
            return [
              {
                action: "VIEW_DETAILS",
                label: "View Details",
                variant: "outline",
              },
            ];
        }
      };

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        shopifyOrderId: order.shopifyOrderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        itemCount: order.items.length,
        totalWeight: order.items.reduce(
          (sum, item) =>
            sum + (Number(item.productVariant.weight) || 1) * item.quantity,
          0
        ),
        priority,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        shippingLocation: {
          city: shippingAddr?.city || "Unknown",
          state:
            shippingAddr?.province_code || shippingAddr?.province || "Unknown",
          country: shippingAddr?.country_code || "US",
        },
        pickListInfo,
        nextActions: getNextActions(order.status, pickListInfo),
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productVariant.product?.name || "Unnamed Product",
          sku: item.productVariant.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
        })),
      };
    });

    // Calculate summary statistics
    const stats = {
      total: managementOrders.length,
      pending: managementOrders.filter((o) => o.status === "PENDING").length,
      allocated: managementOrders.filter((o) => o.status === "ALLOCATED")
        .length,
      picking: managementOrders.filter((o) => o.status === "PICKING").length,
      picked: managementOrders.filter((o) => o.status === "PICKED").length,
      packed: managementOrders.filter((o) => o.status === "PACKED").length,
      shipped: managementOrders.filter((o) => o.status === "SHIPPED").length,
      fulfilled: managementOrders.filter((o) => o.status === "FULFILLED")
        .length,
      urgent: managementOrders.filter((o) => o.priority === "URGENT").length,
      high: managementOrders.filter((o) => o.priority === "HIGH").length,
    };

    return NextResponse.json({
      success: true,
      orders: managementOrders,
      stats,
      totalCount,
      totalPages,
      currentPage: page,
      filters: {
        status: status || "ALL",
        search: search || "",
        priority: priority || "ALL",
      },
    });
  } catch (error) {
    console.error("Error fetching orders for management:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

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
//     const status = searchParams.get("status");
//     const search = searchParams.get("search");
//     const priority = searchParams.get("priority");
//     const dateFrom = searchParams.get("dateFrom");
//     const dateTo = searchParams.get("dateTo");

//     // ✅ NEW: Get pagination parameters
//     const page = parseInt(searchParams.get("page") || "1");
//     const limit = parseInt(searchParams.get("limit") || "20");
//     const skip = (page - 1) * limit;

//     // Build dynamic where clause
//     const whereClause: any = {};

//     if (status && status !== "ALL") {
//       whereClause.status = status;
//     }

//     if (search) {
//       whereClause.OR = [
//         { orderNumber: { contains: search, mode: "insensitive" } },
//         { customerName: { contains: search, mode: "insensitive" } },
//         { customerEmail: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     if (dateFrom) {
//       whereClause.createdAt = { gte: new Date(dateFrom) };
//     }

//     if (dateTo) {
//       whereClause.createdAt = {
//         ...whereClause.createdAt,
//         lte: new Date(dateTo),
//       };
//     }

//     // ✅ NEW: Get total count for pagination
//     const totalCount = await prisma.order.count({ where: whereClause });
//     const totalPages = Math.ceil(totalCount / limit);

//     // Get orders with related data
//     const orders = await prisma.order.findMany({
//       where: whereClause,
//       include: {
//         items: {
//           include: {
//             productVariant: {
//               include: {
//                 product: true,
//               },
//             },
//           },
//         },
//         pickListItems: {
//           include: {
//             pickList: {
//               select: {
//                 id: true,
//                 batchNumber: true,
//                 status: true,
//                 startTime: true,
//                 assignedUser: {
//                   select: { name: true },
//                 },
//               },
//             },
//           },
//         },
//       },
//       orderBy: [{ createdAt: "desc" }],
//       skip, // ✅ NEW: Use pagination
//       take: limit, // ✅ NEW: Use limit from params
//     });

//     // Transform orders for management view
//     const managementOrders = orders.map((order) => {
//       const shippingAddr = order.shippingAddress as any;

//       // Calculate order priority
//       const orderAge = Date.now() - new Date(order.createdAt).getTime();
//       const hoursOld = orderAge / (1000 * 60 * 60);
//       const orderValue = Number(order.totalAmount);

//       let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "LOW";
//       if (hoursOld > 48 || orderValue > 500) priority = "URGENT";
//       else if (hoursOld > 24 || orderValue > 200) priority = "HIGH";
//       else if (hoursOld > 12 || orderValue > 100) priority = "MEDIUM";

//       // Get the pick list info for this specific order
//       const pickListItem = order.pickListItems.find(
//         (pli) => pli.orderId === order.id
//       );

//       const pickListInfo = pickListItem?.pickList
//         ? {
//             pickListId: pickListItem.pickList.id,
//             batchNumber: pickListItem.pickList.batchNumber,
//             pickStatus: pickListItem.pickList.status,
//             assignedTo: pickListItem.pickList.assignedUser?.name,
//             startTime: pickListItem.pickList.startTime,
//           }
//         : null;

//       // Determine next actions based on status
//       const getNextActions = (status: string) => {
//         switch (status) {
//           case "PENDING":
//             return [
//               {
//                 action: "ALLOCATE",
//                 label: "Allocate Inventory",
//                 variant: "default",
//               },
//             ];
//           case "ALLOCATED":
//             return [
//               {
//                 action: "GENERATE_SINGLE_PICK",
//                 label: "Generate Pick List",
//                 variant: "default",
//               },
//               {
//                 action: "VIEW_DETAILS",
//                 label: "View Details",
//                 variant: "outline",
//               },
//             ];
//           case "PICKING":
//             return [
//               {
//                 action: "VIEW_PICK_PROGRESS",
//                 label: "View Pick Progress",
//                 variant: "default",
//               },
//               {
//                 action: "MOBILE_PICK",
//                 label: "Start Pick",
//                 variant: "outline",
//               },
//             ];
//           case "PICKED":
//             return [
//               { action: "PACK_ORDER", label: "Pack Order", variant: "default" },
//               {
//                 action: "VIEW_DETAILS",
//                 label: "View Details",
//                 variant: "outline",
//               },
//             ];
//           case "PACKED":
//             return [
//               {
//                 action: "CREATE_LABEL",
//                 label: "Create Shipping Label",
//                 variant: "default",
//               },
//               {
//                 action: "VIEW_DETAILS",
//                 label: "View Details",
//                 variant: "outline",
//               },
//             ];
//           case "SHIPPED":
//             return [
//               {
//                 action: "MARK_FULFILLED",
//                 label: "Mark Fulfilled",
//                 variant: "default",
//               },
//               {
//                 action: "VIEW_TRACKING",
//                 label: "View Tracking",
//                 variant: "outline",
//               },
//             ];
//           case "DELIVERED":
//           case "FULFILLED":
//             return [
//               {
//                 action: "VIEW_DETAILS",
//                 label: "View Details",
//                 variant: "outline",
//               },
//             ];
//           default:
//             return [
//               {
//                 action: "VIEW_DETAILS",
//                 label: "View Details",
//                 variant: "outline",
//               },
//             ];
//         }
//       };

//       return {
//         id: order.id,
//         orderNumber: order.orderNumber,
//         shopifyOrderId: order.shopifyOrderId,
//         customerName: order.customerName,
//         customerEmail: order.customerEmail,
//         status: order.status,
//         totalAmount: order.totalAmount.toString(),
//         itemCount: order.items.length,
//         totalWeight: order.items.reduce(
//           (sum, item) =>
//             sum + (Number(item.productVariant.weight) || 1) * item.quantity,
//           0
//         ),
//         priority,
//         createdAt: order.createdAt.toISOString(),
//         updatedAt: order.updatedAt.toISOString(),
//         shippingLocation: {
//           city: shippingAddr?.city || "Unknown",
//           state:
//             shippingAddr?.province_code || shippingAddr?.province || "Unknown",
//           country: shippingAddr?.country_code || "US",
//         },
//         pickListInfo,
//         nextActions: getNextActions(order.status),
//         items: order.items.map((item) => ({
//           id: item.id,
//           productName: item.productVariant.product?.name || "Unnamed Product",
//           sku: item.productVariant.sku,
//           quantity: item.quantity,
//           unitPrice: item.unitPrice.toString(),
//           totalPrice: item.totalPrice.toString(),
//         })),
//       };
//     });

//     // Calculate summary statistics
//     const stats = {
//       total: managementOrders.length,
//       pending: managementOrders.filter((o) => o.status === "PENDING").length,
//       allocated: managementOrders.filter((o) => o.status === "ALLOCATED")
//         .length,
//       picking: managementOrders.filter((o) => o.status === "PICKING").length,
//       picked: managementOrders.filter((o) => o.status === "PICKED").length,
//       packed: managementOrders.filter((o) => o.status === "PACKED").length,
//       shipped: managementOrders.filter((o) => o.status === "SHIPPED").length,
//       fulfilled: managementOrders.filter((o) => o.status === "FULFILLED")
//         .length,
//       urgent: managementOrders.filter((o) => o.priority === "URGENT").length,
//       high: managementOrders.filter((o) => o.priority === "HIGH").length,
//     };

//     // ✅ NEW: Return with pagination metadata
//     return NextResponse.json({
//       success: true,
//       orders: managementOrders,
//       stats,
//       totalCount, // ✅ NEW
//       totalPages, // ✅ NEW
//       currentPage: page, // ✅ NEW
//       filters: {
//         status: status || "ALL",
//         search: search || "",
//         priority: priority || "ALL",
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching orders for management:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch orders" },
//       { status: 500 }
//     );
//   }
// }
