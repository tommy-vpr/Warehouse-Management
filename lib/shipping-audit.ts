// lib/shipping-audit.ts
import { prisma } from "@/lib/prisma";
import { WorkTaskEventType } from "@prisma/client";

interface ShippingAuditData {
  taskId: string;
  userId: string;
  eventType: WorkTaskEventType;
  notes?: string;
  data?: {
    trackingNumber?: string;
    trackingNumbers?: string[];
    carrier?: string;
    serviceLevel?: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    shippingCost?: number;
    insuranceAmount?: number;
    rateQuotes?: any[];
    quoteCount?: number;
    packageId?: string;
    packageIds?: string[];
    manifestId?: string;
    pickupDate?: string;
    voidReason?: string;
    progress?: {
      completedOrders: number;
      totalOrders: number;
      completedItems: number;
      totalItems: number;
    };
  };
}

/**
 * Core function to log shipping events to the audit trail
 */
export async function logShippingEvent(params: ShippingAuditData) {
  try {
    await prisma.taskEvent.create({
      data: {
        taskId: params.taskId,
        userId: params.userId,
        eventType: params.eventType,
        notes: params.notes,
        data: params.data as any,
      },
    });
    console.log(`✅ Logged shipping event: ${params.eventType}`);
  } catch (error) {
    console.error("❌ Failed to log shipping event:", error);
    // Don't throw - audit logging should never break the main flow
  }
}

/**
 * Log when a shipping label is generated
 */
export async function logLabelGenerated(
  taskId: string,
  userId: string,
  packageData: {
    packageId: string;
    trackingNumber: string;
    carrier: string;
    serviceLevel: string;
    weight: number;
    shippingCost: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
  }
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "LABEL_GENERATED",
    data: packageData,
    notes: `Label created for tracking ${packageData.trackingNumber}`,
  });
}

/**
 * Log when multiple labels are generated (batch)
 */
export async function logBatchLabelsGenerated(
  taskId: string,
  userId: string,
  batchData: {
    packageIds: string[];
    trackingNumbers: string[];
    carrier: string;
    serviceLevel: string;
    totalWeight: number;
    totalCost: number;
    packageCount: number;
  }
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "LABEL_GENERATED",
    data: batchData,
    notes: `Batch of ${batchData.packageCount} labels created`,
  });
}

/**
 * Log when a package is weighed
 */
export async function logPackageWeighed(
  taskId: string,
  userId: string,
  weight: number,
  packageId?: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "PACKAGE_WEIGHED",
    data: { weight, packageId },
    notes: `Package weighed: ${weight}oz`,
  });
}

/**
 * Log when package dimensions are recorded
 */
export async function logPackageDimensions(
  taskId: string,
  userId: string,
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  },
  packageId?: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "PACKAGE_DIMENSIONS_RECORDED",
    data: { dimensions, packageId },
    notes: `Dimensions: ${dimensions.length}×${dimensions.width}×${dimensions.height}${dimensions.unit}`,
  });
}

/**
 * Log when rate shopping is performed
 */
export async function logRateShopping(
  taskId: string,
  userId: string,
  rateQuotes: any[]
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "RATE_SHOPPED",
    data: { rateQuotes, quoteCount: rateQuotes.length },
    notes: `Compared ${rateQuotes.length} rate options`,
  });
}

/**
 * Log when a carrier and service level are selected
 */
export async function logCarrierSelected(
  taskId: string,
  userId: string,
  carrier: string,
  serviceLevel: string,
  shippingCost?: number
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "CARRIER_SELECTED",
    data: { carrier, serviceLevel, shippingCost },
    notes: `Selected ${carrier} - ${serviceLevel}`,
  });
}

/**
 * Log when a shipment is manifested
 */
export async function logShipmentManifested(
  taskId: string,
  userId: string,
  manifestId: string,
  packageIds: string[]
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "SHIPMENT_MANIFESTED",
    data: { manifestId, packageIds },
    notes: `${packageIds.length} package(s) manifested`,
  });
}

/**
 * Log when a label is voided
 */
export async function logLabelVoided(
  taskId: string,
  userId: string,
  trackingNumber: string,
  reason: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "LABEL_VOIDED",
    data: { trackingNumber, voidReason: reason },
    notes: `Label voided: ${reason}`,
  });
}

/**
 * Log when a label is printed
 */
export async function logLabelPrinted(
  taskId: string,
  userId: string,
  trackingNumber: string,
  packageId?: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "LABEL_PRINTED",
    data: { trackingNumber, packageId },
    notes: `Label printed for ${trackingNumber}`,
  });
}

/**
 * Log when insurance is added to a shipment
 */
export async function logInsuranceAdded(
  taskId: string,
  userId: string,
  insuranceAmount: number,
  trackingNumber?: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "INSURANCE_ADDED",
    data: { insuranceAmount, trackingNumber },
    notes: `Insurance added: $${insuranceAmount}`,
  });
}

/**
 * Log when signature is required
 */
export async function logSignatureRequired(
  taskId: string,
  userId: string,
  trackingNumber?: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "SIGNATURE_REQUIRED",
    data: { trackingNumber },
    notes: "Signature required on delivery",
  });
}

/**
 * Log when tracking number is assigned
 */
export async function logTrackingAssigned(
  taskId: string,
  userId: string,
  trackingNumber: string,
  carrier: string
) {
  return logShippingEvent({
    taskId,
    userId,
    eventType: "TRACKING_NUMBER_ASSIGNED",
    data: { trackingNumber, carrier },
    notes: `Tracking assigned: ${trackingNumber}`,
  });
}

/**
 * Find or create a shipping task for an order
 * This ensures all shipping events are properly associated with a WorkTask
 */
export async function getOrCreateShippingTask(
  orderId: string,
  userId: string,
  orderNumber?: string
) {
  try {
    // Try to find existing shipping task
    let shippingTask = await prisma.workTask.findFirst({
      where: {
        type: "SHIPPING",
        orderIds: { has: orderId },
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
    });

    // Return existing task if found
    if (shippingTask) {
      console.log(
        `📋 Using existing shipping task: ${shippingTask.taskNumber}`
      );
      return shippingTask;
    }

    // ✅ FIX: Get order with items to create proper task items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { productVariant: true },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // ✅ FIX: Create task items (one per product)
    const taskItems: any[] = [];
    let sequence = 1;

    for (const orderItem of order.items) {
      taskItems.push({
        orderId: order.id,
        productVariantId: orderItem.productVariantId,
        quantityRequired: orderItem.quantity,
        quantityCompleted: 0,
        status: "PENDING",
        sequence: sequence++,
      });
    }

    console.log(
      `📦 Creating shipping task with ${taskItems.length} items for order ${
        orderNumber || orderId
      }`
    );

    const taskNumber = `SHIP-${Date.now().toString().slice(-6)}`;

    // ✅ FIX: Use transaction to create task + items atomically
    shippingTask = await prisma.$transaction(async (tx) => {
      const task = await tx.workTask.create({
        data: {
          taskNumber,
          type: "SHIPPING",
          status: "IN_PROGRESS",
          orderIds: [orderId],
          totalOrders: 1,
          totalItems: taskItems.length, // ✅ Use actual item count
          assignedTo: userId,
          assignedAt: new Date(),
          startedAt: new Date(),
        },
      });

      // ✅ Create task items
      await tx.taskItem.createMany({
        data: taskItems.map((item) => ({
          ...item,
          taskId: task.id,
        })),
      });

      // ✅ Validate items were created
      const createdCount = await tx.taskItem.count({
        where: { taskId: task.id },
      });

      if (createdCount !== taskItems.length) {
        throw new Error(
          `Failed to create task items. Expected ${taskItems.length}, got ${createdCount}`
        );
      }

      console.log(
        `✅ Created shipping task: ${taskNumber} with ${createdCount} items`
      );

      return task;
    });

    // Log task creation event
    await logShippingEvent({
      taskId: shippingTask.id,
      userId,
      eventType: "TASK_CREATED",
      notes: `Shipping task created for order ${orderNumber || orderId}`,
    });

    // Log task started event
    await logShippingEvent({
      taskId: shippingTask.id,
      userId,
      eventType: "TASK_STARTED",
      notes: `Shipping started for order ${orderNumber || orderId}`,
    });

    return shippingTask;
  } catch (error) {
    console.error("❌ Failed to get/create shipping task:", error);
    throw error;
  }
}

/**
 * Mark shipping task as completed
 */
export async function completeShippingTask(
  taskId: string,
  userId: string,
  packageCount: number
) {
  try {
    // ✅ FIX: Get task to set proper completed counts
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Shipping task ${taskId} not found`);
    }

    // ✅ FIX: Update ALL completion fields
    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedOrders: task.totalOrders, // ✅ Set to total
        completedItems: task.totalItems, // ✅ Set to total
      },
    });

    await logShippingEvent({
      taskId,
      userId,
      eventType: "TASK_COMPLETED",
      notes: `Shipping completed with ${packageCount} package(s)`,
      data: {
        progress: {
          completedItems: task.totalItems,
          totalItems: task.totalItems,
          completedOrders: task.totalOrders,
          totalOrders: task.totalOrders,
        },
      },
    });

    console.log(`✅ Shipping task ${taskId} marked as completed`);
  } catch (error) {
    console.error("❌ Failed to complete shipping task:", error);
    // Don't throw - this shouldn't break the main flow
  }
}

// // lib/shipping-audit.ts
// import { prisma } from "@/lib/prisma";
// import { WorkTaskEventType } from "@prisma/client";

// interface ShippingAuditData {
//   taskId: string;
//   userId: string;
//   eventType: WorkTaskEventType;
//   notes?: string;
//   data?: {
//     trackingNumber?: string;
//     trackingNumbers?: string[];
//     carrier?: string;
//     serviceLevel?: string;
//     weight?: number;
//     dimensions?: {
//       length: number;
//       width: number;
//       height: number;
//       unit: string;
//     };
//     shippingCost?: number;
//     insuranceAmount?: number;
//     rateQuotes?: any[];
//     packageId?: string;
//     packageIds?: string[];
//     manifestId?: string;
//     pickupDate?: string;
//     voidReason?: string;
//     progress?: {
//       completedOrders: number;
//       totalOrders: number;
//       completedItems: number;
//       totalItems: number;
//     };
//   };
// }

// /**
//  * Core function to log shipping events to the audit trail
//  */
// export async function logShippingEvent(params: ShippingAuditData) {
//   try {
//     await prisma.taskEvent.create({
//       data: {
//         taskId: params.taskId,
//         userId: params.userId,
//         eventType: params.eventType,
//         notes: params.notes,
//         data: params.data as any,
//       },
//     });
//     console.log(`✅ Logged shipping event: ${params.eventType}`);
//   } catch (error) {
//     console.error("❌ Failed to log shipping event:", error);
//     // Don't throw - audit logging should never break the main flow
//   }
// }

// /**
//  * Log when a shipping label is generated
//  */
// export async function logLabelGenerated(
//   taskId: string,
//   userId: string,
//   packageData: {
//     packageId: string;
//     trackingNumber: string;
//     carrier: string;
//     serviceLevel: string;
//     weight: number;
//     shippingCost: number;
//     dimensions?: {
//       length: number;
//       width: number;
//       height: number;
//       unit: string;
//     };
//   }
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "LABEL_GENERATED",
//     data: packageData,
//     notes: `Label created for tracking ${packageData.trackingNumber}`,
//   });
// }

// /**
//  * Log when multiple labels are generated (batch)
//  */
// export async function logBatchLabelsGenerated(
//   taskId: string,
//   userId: string,
//   batchData: {
//     packageIds: string[];
//     trackingNumbers: string[];
//     carrier: string;
//     serviceLevel: string;
//     totalWeight: number;
//     totalCost: number;
//     packageCount: number;
//   }
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "LABEL_GENERATED",
//     data: batchData,
//     notes: `Batch of ${batchData.packageCount} labels created`,
//   });
// }

// /**
//  * Log when a package is weighed
//  */
// export async function logPackageWeighed(
//   taskId: string,
//   userId: string,
//   weight: number,
//   packageId?: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "PACKAGE_WEIGHED",
//     data: { weight, packageId },
//     notes: `Package weighed: ${weight}oz`,
//   });
// }

// /**
//  * Log when package dimensions are recorded
//  */
// export async function logPackageDimensions(
//   taskId: string,
//   userId: string,
//   dimensions: {
//     length: number;
//     width: number;
//     height: number;
//     unit: string;
//   },
//   packageId?: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "PACKAGE_DIMENSIONS_RECORDED",
//     data: { dimensions, packageId },
//     notes: `Dimensions: ${dimensions.length}×${dimensions.width}×${dimensions.height}${dimensions.unit}`,
//   });
// }

// /**
//  * Log when rate shopping is performed
//  */
// export async function logRateShopping(
//   taskId: string,
//   userId: string,
//   rateQuotes: any[]
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "RATE_SHOPPED",
//     data: { rateQuotes, quoteCount: rateQuotes.length },
//     notes: `Compared ${rateQuotes.length} rate options`,
//   });
// }

// /**
//  * Log when a carrier and service level are selected
//  */
// export async function logCarrierSelected(
//   taskId: string,
//   userId: string,
//   carrier: string,
//   serviceLevel: string,
//   shippingCost?: number
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "CARRIER_SELECTED",
//     data: { carrier, serviceLevel, shippingCost },
//     notes: `Selected ${carrier} - ${serviceLevel}`,
//   });
// }

// /**
//  * Log when a shipment is manifested
//  */
// export async function logShipmentManifested(
//   taskId: string,
//   userId: string,
//   manifestId: string,
//   packageIds: string[]
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "SHIPMENT_MANIFESTED",
//     data: { manifestId, packageIds },
//     notes: `${packageIds.length} package(s) manifested`,
//   });
// }

// /**
//  * Log when a label is voided
//  */
// export async function logLabelVoided(
//   taskId: string,
//   userId: string,
//   trackingNumber: string,
//   reason: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "LABEL_VOIDED",
//     data: { trackingNumber, voidReason: reason },
//     notes: `Label voided: ${reason}`,
//   });
// }

// /**
//  * Log when a label is printed
//  */
// export async function logLabelPrinted(
//   taskId: string,
//   userId: string,
//   trackingNumber: string,
//   packageId?: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "LABEL_PRINTED",
//     data: { trackingNumber, packageId },
//     notes: `Label printed for ${trackingNumber}`,
//   });
// }

// /**
//  * Log when insurance is added to a shipment
//  */
// export async function logInsuranceAdded(
//   taskId: string,
//   userId: string,
//   insuranceAmount: number,
//   trackingNumber?: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "INSURANCE_ADDED",
//     data: { insuranceAmount, trackingNumber },
//     notes: `Insurance added: $${insuranceAmount}`,
//   });
// }

// /**
//  * Log when signature is required
//  */
// export async function logSignatureRequired(
//   taskId: string,
//   userId: string,
//   trackingNumber?: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "SIGNATURE_REQUIRED",
//     data: { trackingNumber },
//     notes: "Signature required on delivery",
//   });
// }

// /**
//  * Log when tracking number is assigned
//  */
// export async function logTrackingAssigned(
//   taskId: string,
//   userId: string,
//   trackingNumber: string,
//   carrier: string
// ) {
//   return logShippingEvent({
//     taskId,
//     userId,
//     eventType: "TRACKING_NUMBER_ASSIGNED",
//     data: { trackingNumber, carrier },
//     notes: `Tracking assigned: ${trackingNumber}`,
//   });
// }

// /**
//  * Find or create a shipping task for an order
//  * This ensures all shipping events are properly associated with a WorkTask
//  */
// export async function getOrCreateShippingTask(
//   orderId: string,
//   userId: string,
//   orderNumber?: string
// ) {
//   try {
//     // Try to find existing shipping task
//     let shippingTask = await prisma.workTask.findFirst({
//       where: {
//         type: "SHIPPING",
//         orderIds: { has: orderId },
//         status: { in: ["ASSIGNED", "IN_PROGRESS"] },
//       },
//     });

//     // Create new task if none exists
//     if (!shippingTask) {
//       const taskNumber = `SHIP-${Date.now().toString().slice(-6)}`;

//       shippingTask = await prisma.workTask.create({
//         data: {
//           taskNumber,
//           type: "SHIPPING",
//           status: "IN_PROGRESS",
//           orderIds: [orderId],
//           totalOrders: 1,
//           totalItems: 1, // Will be updated as packages are created
//           assignedTo: userId,
//           assignedAt: new Date(),
//           startedAt: new Date(),
//         },
//       });

//       console.log(
//         `✅ Created shipping task: ${taskNumber} for order ${
//           orderNumber || orderId
//         }`
//       );

//       // Log task creation event
//       await logShippingEvent({
//         taskId: shippingTask.id,
//         userId,
//         eventType: "TASK_CREATED",
//         notes: `Shipping task created for order ${orderNumber || orderId}`,
//       });

//       // Log task started event
//       await logShippingEvent({
//         taskId: shippingTask.id,
//         userId,
//         eventType: "TASK_STARTED",
//         notes: `Shipping started for order ${orderNumber || orderId}`,
//       });
//     }

//     return shippingTask;
//   } catch (error) {
//     console.error("❌ Failed to get/create shipping task:", error);
//     throw error;
//   }
// }

// /**
//  * Mark shipping task as completed
//  */
// export async function completeShippingTask(
//   taskId: string,
//   userId: string,
//   completedItems: number
// ) {
//   try {
//     await prisma.workTask.update({
//       where: { id: taskId },
//       data: {
//         status: "COMPLETED",
//         completedAt: new Date(),
//         completedItems,
//       },
//     });

//     await logShippingEvent({
//       taskId,
//       userId,
//       eventType: "TASK_COMPLETED",
//       notes: `Shipping task completed with ${completedItems} package(s)`,
//       data: {
//         progress: {
//           completedItems,
//           totalItems: completedItems,
//           completedOrders: 1,
//           totalOrders: 1,
//         },
//       },
//     });

//     console.log(`✅ Shipping task ${taskId} marked as completed`);
//   } catch (error) {
//     console.error("❌ Failed to complete shipping task:", error);
//     // Don't throw - this shouldn't break the main flow
//   }
// }
