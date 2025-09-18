export async function generateBulkPickLists(orderIds: string[]) {
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/picking/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderIds,
        pickingStrategy: "BATCH",
        maxItems: 50,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to generate pick lists");
  }

  return await response.json();
}
