// lib/ably-server.ts
// FIXED VERSION - Prevents duplicate notifications
import Ably from "ably";
import { prisma } from "@/lib/prisma";

let ablyClient: Ably.Rest | null = null;

export function getAblyClient(): Ably.Rest {
  if (!ablyClient) {
    const apiKey = process.env.ABLY_API_KEY;

    if (!apiKey) {
      throw new Error("ABLY_API_KEY is not configured");
    }

    ablyClient = new Ably.Rest(apiKey);
  }

  return ablyClient;
}

// Helper function to send notifications
export async function sendNotification(
  channel: string,
  event: string,
  data: any
) {
  try {
    const client = getAblyClient();
    const ablyChannel = client.channels.get(channel);
    await ablyChannel.publish(event, data);
    console.log(`✅ Published ${event} to Ably channel: ${channel}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to ${channel}:`, error);
    return false;
  }
}

// Helper to notify specific user
export async function notifyUser(userId: string, data: any) {
  try {
    // Create database notification
    await prisma.notification.create({
      data: {
        userId,
        type: data.type || "GENERAL",
        title: data.title,
        message: data.message,
        link: data.link || null,
        read: false,
        metadata: data.metadata || null,
      },
    });

    // Send real-time notification via Ably
    return sendNotification(`user:${userId}`, "notification", data);
  } catch (error) {
    console.error(`❌ Failed to notify user ${userId}:`, error);
    return false;
  }
}

// ✅ FIXED: Only sends to individual user channels (no duplication)
export async function notifyRole(role: string, event: string, data: any) {
  try {
    // Get all users with this role
    const users = await prisma.user.findMany({
      where: { role: role as any },
      select: { id: true, email: true, name: true },
    });

    if (users.length === 0) {
      console.warn(`⚠️  No users found with role: ${role}`);
      return false;
    }

    console.log(`📢 Notifying ${users.length} ${role} users about ${event}`);

    // Create database notifications for all users
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: data.type || "GENERAL",
        title: data.title,
        message: data.message,
        link: data.link || null,
        read: false,
        metadata: data.metadata || null,
      })),
    });

    console.log(`✅ Created ${users.length} database notifications`);

    // ✅ ONLY send to individual user channels (prevents duplication)
    // Each user gets exactly ONE notification via their user channel
    for (const user of users) {
      await sendNotification(`user:${user.id}`, "notification", {
        ...data,
        userId: user.id,
      });
    }

    console.log(`✅ Sent ${users.length} individual notifications via Ably`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to notify role ${role}:`, error);
    return false;
  }
}

// Alternative: Use role channels if you prefer broadcast
// In this case, REMOVE the loop sending to user channels above
export async function notifyRoleViaBroadcast(
  role: string,
  event: string,
  data: any
) {
  try {
    const users = await prisma.user.findMany({
      where: { role: role as any },
      select: { id: true },
    });

    if (users.length === 0) {
      console.warn(`⚠️  No users found with role: ${role}`);
      return false;
    }

    console.log(`📢 Broadcasting to role:${role} for ${users.length} users`);

    // Create database notifications
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: data.type || "GENERAL",
        title: data.title,
        message: data.message,
        link: data.link || null,
        read: false,
        metadata: data.metadata || null,
      })),
    });

    // ✅ Only send to role channel (no individual sends)
    await sendNotification(`role:${role}`, event, data);

    console.log(`✅ Broadcast notification to role:${role}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to notify role ${role}:`, error);
    return false;
  }
}

// Helper to broadcast to all users
export async function notifyAll(event: string, data: any) {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    console.log(`📢 Broadcasting ${event} to ${users.length} users`);

    // Create database notifications
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: data.type || "GENERAL",
        title: data.title,
        message: data.message,
        link: data.link || null,
        read: false,
      })),
    });

    // Broadcast via Ably
    return sendNotification("broadcast", event, data);
  } catch (error) {
    console.error(`❌ Failed to broadcast notification:`, error);
    return false;
  }
}

// import Ably from "ably";

// let ablyClient: Ably.Rest | null = null;

// export function getAblyClient(): Ably.Rest {
//   if (!ablyClient) {
//     const apiKey = process.env.ABLY_API_KEY;

//     if (!apiKey) {
//       throw new Error("ABLY_API_KEY is not configured");
//     }

//     ablyClient = new Ably.Rest(apiKey);
//   }

//   return ablyClient;
// }

// // Helper function to send notifications
// export async function sendNotification(
//   channel: string,
//   event: string,
//   data: any
// ) {
//   try {
//     const client = getAblyClient();
//     const ablyChannel = client.channels.get(channel);
//     await ablyChannel.publish(event, data);
//     return true;
//   } catch (error) {
//     console.error(`Failed to send notification to ${channel}:`, error);
//     return false;
//   }
// }

// // Helper to notify specific user
// export async function notifyUser(userId: string, data: any) {
//   return sendNotification(`user:${userId}`, "notification", data);
// }

// // Helper to notify role
// export async function notifyRole(role: string, event: string, data: any) {
//   return sendNotification(`role:${role}`, event, data);
// }
