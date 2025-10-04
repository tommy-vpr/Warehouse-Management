import { prisma } from "@/lib/prisma";

export async function getLastSyncTime(type: "forecast" | "purchase_order") {
  const lastSuccess = await prisma.syncLog.findFirst({
    where: { type, status: "success" },
    orderBy: { runAt: "desc" },
  });

  return lastSuccess?.runAt || null;
}
