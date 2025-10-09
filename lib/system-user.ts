// lib/system-user.ts
import { prisma } from "@/lib/prisma";

const SYSTEM_USER_EMAIL = "system@warehouse.com";

// Cache the system user ID to avoid repeated database queries
let cachedSystemUserId: string | null = null;

/**
 * Get or create the system user for automated processes
 * Uses caching to minimize database queries
 */
export async function getSystemUserId(): Promise<string> {
  // Return cached ID if available
  if (cachedSystemUserId) {
    return cachedSystemUserId;
  }

  // Try to find existing system user
  let systemUser = await prisma.user.findFirst({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });

  // Create if doesn't exist
  if (!systemUser) {
    console.log("📝 Creating system user for automated processes...");
    systemUser = await prisma.user.create({
      data: {
        email: SYSTEM_USER_EMAIL,
        name: "System",
        role: "ADMIN",
      },
      select: { id: true },
    });
    console.log("✅ System user created:", systemUser.id);
  }

  // Cache the ID
  cachedSystemUserId = systemUser.id;
  return systemUser.id;
}

/**
 * Get system user ID within a transaction
 */
export async function getSystemUserIdInTransaction(tx: any): Promise<string> {
  // Check cache first
  if (cachedSystemUserId) {
    return cachedSystemUserId;
  }

  // Find or create within transaction
  let systemUser = await tx.user.findFirst({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });

  if (!systemUser) {
    systemUser = await tx.user.create({
      data: {
        email: SYSTEM_USER_EMAIL,
        name: "System",
        role: "ADMIN",
      },
      select: { id: true },
    });
  }

  cachedSystemUserId = systemUser.id;
  return systemUser.id;
}
