// lib/pickListHelpers.ts
import { prisma } from "@/lib/prisma";

/**
 * Find all pick lists that need reassignment due to staff unavailability
 */
export async function findPickListsNeedingReassignment(staffId: string) {
  const incompleteLists = await prisma.pickList.findMany({
    where: {
      assignedTo: staffId,
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
      },
    },
    include: {
      items: {
        where: {
          status: {
            notIn: ["PICKED", "SKIPPED"],
          },
        },
      },
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return incompleteLists.map((list) => ({
    ...list,
    incompleteItems: list.items.length,
    partialItems: list.items.filter(
      (item) =>
        item.quantityPicked > 0 && item.quantityPicked < item.quantityToPick
    ).length,
  }));
}

/**
 * Automatically reassign all incomplete work from one staff to another
 */
export async function bulkReassignStaffWork(
  fromStaffId: string,
  toStaffId: string,
  managerId: string
) {
  const incompleteLists = await findPickListsNeedingReassignment(fromStaffId);
  const results = [];

  for (const list of incompleteLists) {
    const result = await reassignPickList(
      list.id,
      toStaffId,
      managerId,
      "split" // Use split strategy by default
    );
    results.push(result);
  }

  return {
    reassignedCount: results.length,
    details: results,
  };
}

/**
 * Main reassignment function with both strategies
 */
export async function reassignPickList(
  pickListId: string,
  newStaffId: string,
  managerId: string,
  strategy: "split" | "in-place" = "split"
) {
  const pickList = await prisma.pickList.findUnique({
    where: { id: pickListId },
    include: {
      items: true,
      assignedUser: { select: { id: true, name: true } },
    },
  });

  if (!pickList) {
    throw new Error("Pick list not found");
  }

  // Categorize items
  const partialItems = pickList.items.filter(
    (item) =>
      item.quantityPicked > 0 && item.quantityPicked < item.quantityToPick
  );

  const unpickedItems = pickList.items.filter(
    (item) => item.quantityPicked === 0
  );

  const pickedItems = pickList.items.filter(
    (item) => item.quantityPicked >= item.quantityToPick
  );

  if (partialItems.length === 0 && unpickedItems.length === 0) {
    throw new Error("Nothing to reassign - pick list is complete");
  }

  if (strategy === "split") {
    return await createContinuationPickList(
      pickList,
      partialItems,
      unpickedItems,
      newStaffId,
      managerId
    );
  } else {
    return await splitItemsInPlace(
      pickList,
      partialItems,
      unpickedItems,
      newStaffId,
      managerId
    );
  }
}

/**
 * Strategy 1: Create a new pick list for remaining work
 */
async function createContinuationPickList(
  originalList: any,
  partialItems: any[],
  unpickedItems: any[],
  newStaffId: string,
  managerId: string
) {
  const remainingWork = [];

  // Process partially picked items
  for (const item of partialItems) {
    const remainingQty = item.quantityToPick - item.quantityPicked;

    // Update original item to reflect what WAS picked
    await prisma.pickListItem.update({
      where: { id: item.id },
      data: {
        quantityToPick: item.quantityPicked,
        status: "PICKED",
        pickedAt: new Date(),
      },
    });

    // Add remainder to new list
    remainingWork.push({
      orderId: item.orderId,
      productVariantId: item.productVariantId,
      locationId: item.locationId,
      quantityToPick: remainingQty,
      pickSequence: item.pickSequence,
      notes: `Continuation from ${originalList.batchNumber} - Remaining ${remainingQty} units`,
    });
  }

  // Add completely unpicked items
  for (const item of unpickedItems) {
    remainingWork.push({
      orderId: item.orderId,
      productVariantId: item.productVariantId,
      locationId: item.locationId,
      quantityToPick: item.quantityToPick,
      pickSequence: item.pickSequence,
      notes: `Moved from ${originalList.batchNumber}`,
    });
  }

  // Create continuation pick list
  const continuationList = await prisma.pickList.create({
    data: {
      batchNumber: `${originalList.batchNumber}-CONT`,
      assignedTo: newStaffId,
      status: "ASSIGNED",
      priority: originalList.priority + 1,
      totalItems: remainingWork.length,
      parentPickListId: originalList.id,
      notes: `Continuation of ${originalList.batchNumber} due to staff change`,
      items: {
        create: remainingWork,
      },
    },
    include: {
      items: {
        include: {
          productVariant: { include: { product: true } },
          location: true,
          order: true,
        },
      },
      assignedUser: true,
    },
  });

  // Mark original as partially completed
  await prisma.pickList.update({
    where: { id: originalList.id },
    data: {
      status: "PARTIALLY_COMPLETED",
      endTime: new Date(),
      notes: `Partially completed by ${originalList.assignedUser?.name}. Continued in ${continuationList.batchNumber}`,
    },
  });

  // Update order assignments for unpicked items
  const uniqueOrderIds = [
    ...new Set(remainingWork.map((item) => item.orderId)),
  ];
  await prisma.order.updateMany({
    where: { id: { in: uniqueOrderIds } },
    data: {
      pickingAssignedTo: newStaffId,
    },
  });

  // Log the event
  await prisma.pickEvent.create({
    data: {
      pickListId: originalList.id,
      eventType: "PICK_SPLIT",
      userId: managerId,
      notes: `Pick list split and reassigned from ${originalList.assignedUser?.name} to new staff`,
      data: {
        continuationListId: continuationList.id,
        continuationBatchNumber: continuationList.batchNumber,
        oldStaffId: originalList.assignedTo,
        newStaffId: newStaffId,
        partialItemsSplit: partialItems.length,
        unpickedItemsMoved: unpickedItems.length,
      },
    },
  });

  return {
    success: true,
    strategy: "split",
    original: {
      id: originalList.id,
      batchNumber: originalList.batchNumber,
      status: "PARTIALLY_COMPLETED",
    },
    continuation: {
      id: continuationList.id,
      batchNumber: continuationList.batchNumber,
      totalItems: remainingWork.length,
      assignedTo: newStaffId,
    },
    summary: {
      partialItemsSplit: partialItems.length,
      unpickedItemsMoved: unpickedItems.length,
      totalItemsReassigned: remainingWork.length,
    },
  };
}

/**
 * Strategy 2: Split items within the same pick list
 */
async function splitItemsInPlace(
  originalList: any,
  partialItems: any[],
  unpickedItems: any[],
  newStaffId: string,
  managerId: string
) {
  const splitItems = [];

  // Split partial items
  for (const item of partialItems) {
    // Close out what was picked
    await prisma.pickListItem.update({
      where: { id: item.id },
      data: {
        quantityToPick: item.quantityPicked,
        status: "PICKED",
        pickedAt: new Date(),
      },
    });

    // Create new item for remainder
    const remainingQty = item.quantityToPick - item.quantityPicked;
    const newItem = await prisma.pickListItem.create({
      data: {
        pickListId: originalList.id,
        orderId: item.orderId,
        productVariantId: item.productVariantId,
        locationId: item.locationId,
        quantityToPick: remainingQty,
        pickSequence: item.pickSequence,
        status: "PENDING",
        notes: `Split from item ${item.id} - Remaining ${remainingQty} units after staff change`,
      },
    });

    splitItems.push(newItem);
  }

  // Calculate new totals
  const allItems = await prisma.pickListItem.findMany({
    where: { pickListId: originalList.id },
  });

  const pickedCount = allItems.filter((i) => i.status === "PICKED").length;

  // Reassign the list
  const updated = await prisma.pickList.update({
    where: { id: originalList.id },
    data: {
      assignedTo: newStaffId,
      status: pickedCount === 0 ? "ASSIGNED" : "IN_PROGRESS",
      totalItems: allItems.length,
      pickedItems: pickedCount,
      notes: `Reassigned with ${partialItems.length} items split`,
    },
  });

  // Update order assignments
  const uniqueOrderIds = [
    ...new Set([
      ...unpickedItems.map((i) => i.orderId),
      ...partialItems.map((i) => i.orderId),
    ]),
  ];

  await prisma.order.updateMany({
    where: { id: { in: uniqueOrderIds } },
    data: {
      pickingAssignedTo: newStaffId,
    },
  });

  // Log event
  await prisma.pickEvent.create({
    data: {
      pickListId: originalList.id,
      eventType: "PICK_REASSIGNED",
      userId: managerId,
      notes: `Reassigned from ${originalList.assignedUser?.name} to new staff with item splitting`,
      data: {
        oldStaffId: originalList.assignedTo,
        newStaffId: newStaffId,
        itemsSplit: partialItems.length,
        itemsReassigned: unpickedItems.length,
      },
    },
  });

  return {
    success: true,
    strategy: "in-place",
    pickList: updated,
    summary: {
      itemsSplit: splitItems.length,
      unpickedItemsReassigned: unpickedItems.length,
      newTotalItems: allItems.length,
    },
  };
}

/**
 * Get picking metrics for a staff member
 */
export async function getStaffPickingMetrics(
  staffId: string,
  startDate: Date,
  endDate: Date
) {
  const pickLists = await prisma.pickList.findMany({
    where: {
      assignedTo: staffId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: true,
    },
  });

  const completedLists = pickLists.filter((pl) => pl.status === "COMPLETED");
  const totalItems = pickLists.reduce((sum, pl) => sum + pl.totalItems, 0);
  const pickedItems = pickLists.reduce((sum, pl) => sum + pl.pickedItems, 0);

  // Calculate average pick time
  const avgPickTime =
    completedLists
      .filter((pl) => pl.startTime && pl.endTime)
      .reduce((sum, pl) => {
        const duration = pl.endTime!.getTime() - pl.startTime!.getTime();
        return sum + duration;
      }, 0) / (completedLists.length || 1);

  return {
    staffId,
    period: { startDate, endDate },
    totalPickLists: pickLists.length,
    completedPickLists: completedLists.length,
    totalItemsAssigned: totalItems,
    totalItemsPicked: pickedItems,
    completionRate: totalItems > 0 ? (pickedItems / totalItems) * 100 : 0,
    avgPickTimeMinutes: Math.round(avgPickTime / 60000),
    itemsPerHour:
      avgPickTime > 0 ? Math.round((pickedItems / avgPickTime) * 3600000) : 0,
  };
}

/**
 * End of shift - automatically handle incomplete pick lists
 */
export async function handleEndOfShift(
  staffId: string,
  replacementStaffId?: string,
  managerId?: string
) {
  const incompleteLists = await findPickListsNeedingReassignment(staffId);

  if (incompleteLists.length === 0) {
    return {
      success: true,
      message: "No incomplete pick lists to process",
      pickLists: [],
    };
  }

  if (replacementStaffId) {
    // Reassign to specific replacement
    const results = await bulkReassignStaffWork(
      staffId,
      replacementStaffId,
      managerId || staffId
    );
    return results;
  } else {
    // Just pause the pick lists for later assignment
    await prisma.pickList.updateMany({
      where: {
        id: { in: incompleteLists.map((pl) => pl.id) },
      },
      data: {
        status: "PAUSED",
        notes: "Paused at end of shift - awaiting reassignment",
      },
    });

    return {
      success: true,
      message: "Pick lists paused for reassignment",
      pickLists: incompleteLists,
    };
  }
}

/**
 * Get continuation chain for a pick list
 */
export async function getPickListChain(pickListId: string) {
  const pickList = await prisma.pickList.findUnique({
    where: { id: pickListId },
    include: {
      parentPickList: true,
      continuations: {
        include: {
          assignedUser: true,
        },
      },
    },
  });

  if (!pickList) return null;

  // Find the root parent
  let root = pickList;
  while (root.parentPickList) {
    root = (await prisma.pickList.findUnique({
      where: { id: root.parentPickListId! },
      include: { parentPickList: true },
    })) as any;
  }

  // Get all continuations from root
  const getAllContinuations = async (id: string): Promise<any[]> => {
    const list = await prisma.pickList.findUnique({
      where: { id },
      include: {
        continuations: {
          include: {
            assignedUser: true,
            continuations: true,
          },
        },
      },
    });

    if (!list || list.continuations.length === 0) return [];

    const nested = await Promise.all(
      list.continuations.map((cont) => getAllContinuations(cont.id))
    );

    return [...list.continuations, ...nested.flat()];
  };

  const chain = [root, ...(await getAllContinuations(root.id))];

  return {
    root,
    chain,
    totalLists: chain.length,
    currentList: pickList,
  };
}

/**
 * Find optimal staff member for reassignment based on workload
 */
export async function findOptimalStaffForReassignment(excludeStaffId: string) {
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      id: { not: excludeStaffId },
    },
    include: {
      assignedPickLists: {
        where: {
          status: {
            in: ["ASSIGNED", "IN_PROGRESS"],
          },
        },
        include: {
          items: true,
        },
      },
    },
  });

  // Calculate workload score for each staff member
  const staffWithWorkload = staff.map((s) => {
    const totalItems = s.assignedPickLists.reduce(
      (sum, pl) => sum + (pl.totalItems - pl.pickedItems),
      0
    );

    return {
      id: s.id,
      name: s.name,
      activePickLists: s.assignedPickLists.length,
      remainingItems: totalItems,
      workloadScore: totalItems, // Lower is better
    };
  });

  // Sort by workload (ascending)
  staffWithWorkload.sort((a, b) => a.workloadScore - b.workloadScore);

  return staffWithWorkload;
}

/**
 * Check if a pick list has partial completion issues
 */
export async function auditPickListProgress(pickListId: string) {
  const pickList = await prisma.pickList.findUnique({
    where: { id: pickListId },
    include: {
      items: {
        include: {
          productVariant: { include: { product: true } },
          location: true,
          order: true,
        },
      },
    },
  });

  if (!pickList) return null;

  const issues = [];
  const partialItems = [];
  const stuckItems = [];

  for (const item of pickList.items) {
    // Check for partial picks
    if (item.quantityPicked > 0 && item.quantityPicked < item.quantityToPick) {
      partialItems.push({
        itemId: item.id,
        sku: item.productVariant.sku,
        picked: item.quantityPicked,
        needed: item.quantityToPick,
        remaining: item.quantityToPick - item.quantityPicked,
        location: item.location.name,
      });
    }

    // Check for stuck items (pending for too long)
    const hoursSinceCreation =
      (Date.now() - new Date(pickList.createdAt).getTime()) / 3600000;
    if (item.status === "PENDING" && hoursSinceCreation > 4) {
      stuckItems.push({
        itemId: item.id,
        sku: item.productVariant.sku,
        hoursPending: Math.round(hoursSinceCreation),
        location: item.location.name,
      });
    }
  }

  if (partialItems.length > 0) {
    issues.push({
      type: "PARTIAL_PICKS",
      severity: "warning",
      count: partialItems.length,
      details: partialItems,
    });
  }

  if (stuckItems.length > 0) {
    issues.push({
      type: "STUCK_ITEMS",
      severity: "error",
      count: stuckItems.length,
      details: stuckItems,
    });
  }

  return {
    pickListId,
    batchNumber: pickList.batchNumber,
    status: pickList.status,
    hasIssues: issues.length > 0,
    issues,
    summary: {
      totalItems: pickList.totalItems,
      pickedItems: pickList.pickedItems,
      partialItems: partialItems.length,
      stuckItems: stuckItems.length,
    },
  };
}
