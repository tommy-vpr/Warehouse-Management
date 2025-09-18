import { NextRequest, NextResponse } from "next/server";

interface ShipEngineRate {
  rate_id: string;
  service_code: string;
  service_type: string;
  carrier_code: string;
  shipping_amount: {
    currency: string;
    amount: number;
  };
  // Add other properties as needed
}

interface RatesResponse {
  rates: ShipEngineRate[];
  // Add other response properties
}

export async function POST(request: NextRequest) {
  try {
    const { shipment } = await request.json();

    const response = await fetch("https://api.shipengine.com/v1/rates", {
      method: "POST",
      headers: {
        "API-Key": process.env.SHIPENGINE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shipment }),
    });

    if (!response.ok) {
      return NextResponse.json({ compatible: false }, { status: 200 });
    }

    const rates: RatesResponse = await response.json();
    const hasRates = rates.rates && rates.rates.length > 0;

    return NextResponse.json({
      compatible: hasRates,
      availableServices: rates.rates?.map((r) => r.service_code) || [],
    });
  } catch (error) {
    return NextResponse.json({ compatible: false }, { status: 200 });
  }
}
