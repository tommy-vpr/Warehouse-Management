import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SHIPENGINE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ShipEngine API key not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://api.shipengine.com/v1/carriers", {
      headers: {
        "API-Key": apiKey,
      },
    });

    if (!res.ok) {
      let error;
      try {
        error = await res.json();
      } catch {
        error = { message: `HTTP ${res.status}: ${res.statusText}` };
      }
      return NextResponse.json({ error }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data.carriers || []);
  } catch (error) {
    console.error("Failed to fetch carriers:", error);
    return NextResponse.json(
      { error: "Failed to connect to ShipEngine API" },
      { status: 500 }
    );
  }
}
