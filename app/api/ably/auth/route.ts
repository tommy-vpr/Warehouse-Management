import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Ably from "ably";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = new Ably.Rest(process.env.ABLY_API_KEY || "");

    const tokenParams = {
      clientId: session.user.id,
    };

    const tokenRequest = await client.auth.createTokenRequest(tokenParams);

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Error creating Ably token:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
