import Ably from "ably";

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
    return true;
  } catch (error) {
    console.error(`Failed to send notification to ${channel}:`, error);
    return false;
  }
}

// Helper to notify specific user
export async function notifyUser(userId: string, data: any) {
  return sendNotification(`user:${userId}`, "notification", data);
}

// Helper to notify role
export async function notifyRole(role: string, event: string, data: any) {
  return sendNotification(`role:${role}`, event, data);
}
