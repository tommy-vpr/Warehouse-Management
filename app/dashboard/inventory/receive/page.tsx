"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReceiveInventory() {
  const [formData, setFormData] = useState({
    productVariantId: "",
    locationId: "",
    quantity: "",
    reorderPoint: "",
    maxQuantity: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch("/api/inventory/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        quantity: parseInt(formData.quantity),
        reorderPoint: formData.reorderPoint
          ? parseInt(formData.reorderPoint)
          : null,
        maxQuantity: formData.maxQuantity
          ? parseInt(formData.maxQuantity)
          : null,
      }),
    });

    if (response.ok) {
      // Handle success
      setFormData({
        productVariantId: "",
        locationId: "",
        quantity: "",
        reorderPoint: "",
        maxQuantity: "",
        notes: "",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Product Variant ID"
            value={formData.productVariantId}
            onChange={(e) =>
              setFormData({ ...formData, productVariantId: e.target.value })
            }
            required
          />
          <Input
            placeholder="Location ID"
            value={formData.locationId}
            onChange={(e) =>
              setFormData({ ...formData, locationId: e.target.value })
            }
            required
          />
          <Input
            type="number"
            placeholder="Quantity"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
            required
          />
          <Input
            type="number"
            placeholder="Reorder Point (Optional)"
            value={formData.reorderPoint}
            onChange={(e) =>
              setFormData({ ...formData, reorderPoint: e.target.value })
            }
          />
          <Input
            type="number"
            placeholder="Max Quantity (Optional)"
            value={formData.maxQuantity}
            onChange={(e) =>
              setFormData({ ...formData, maxQuantity: e.target.value })
            }
          />
          <Input
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
          <Button type="submit">Receive Inventory</Button>
        </form>
      </CardContent>
    </Card>
  );
}
