import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

export async function GET() {
  try {
    const url = new URL(`${API_URL}/variants`);
    url.searchParams.set("limit", "5");
    url.searchParams.set("page", "0");
    url.searchParams.set("fields", "id,sku,title,replenishment,in_stock");

    const res = await fetchWithRetry(url.toString(), {
      headers: {
        Authorization: API_KEY,
        Account: ACCOUNT_ID,
        Accept: "application/json",
      },
    });

    const json = await res.json();
    console.log("[Test Variants] Response:", JSON.stringify(json, null, 2));

    return NextResponse.json(json);
  } catch (err: any) {
    console.error("[Test Variants] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Test failed" },
      { status: 500 }
    );
  }
}
