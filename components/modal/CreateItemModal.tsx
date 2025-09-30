"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CreateInventoryItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LOCATION_TYPES = [
  "RECEIVING",
  "STORAGE",
  "PICKING",
  "PACKING",
  "SHIPPING",
  "RETURNS",
  "GENERAL",
];

export function CreateItemModal({
  open,
  onOpenChange,
}: CreateInventoryItemModalProps) {
  const queryClient = useQueryClient();
  const [locations, setLocations] = React.useState<
    { id: string; name: string; type: string }[]
  >([]);
  const [createNewLocation, setCreateNewLocation] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      fetch("/api/locations")
        .then((res) => res.json())
        .then(setLocations)
        .catch((err) => console.error("Failed to load locations", err));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload: any = {
      sku: formData.get("sku"),
      upc: formData.get("upc"),
      name: formData.get("name"),
      category: formData.get("category"),
      volume: formData.get("volume"),
      strength: formData.get("strength"),
      reorderPoint: Number(formData.get("reorderPoint") || 0),
      costPrice: formData.get("costPrice"),
      sellingPrice: formData.get("sellingPrice"),
      weight: Number(formData.get("weight") || 0),
    };

    if (createNewLocation) {
      payload.newLocation = {
        name: formData.get("newLocationName"),
        type: formData.get("newLocationType"),
      };
    } else {
      payload.locationId = formData.get("locationId");
    }

    const response = await fetch("/api/inventory/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alert("❌ Failed to create item");
      return;
    }

    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Core product fields */}
          <Input name="sku" placeholder="SKU" required />
          <Input name="upc" placeholder="UPC" />
          <Input name="name" placeholder="Product Name" required />
          <Input name="category" placeholder="Category" required />
          <Input name="volume" placeholder="Volume (e.g. 60ml)" />
          <Input name="strength" placeholder="Strength (e.g. 6mg)" />
          <Input
            type="number"
            name="reorderPoint"
            placeholder="Reorder Point"
          />
          <Input type="number" name="costPrice" placeholder="Cost Price" />
          <Input
            type="number"
            name="sellingPrice"
            placeholder="Selling Price"
          />
          <Input type="number" name="weight" placeholder="Weight (grams)" />

          {/* Location Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Location</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateNewLocation(!createNewLocation)}
              >
                {createNewLocation ? "Use Existing" : "Create New"}
              </Button>
            </div>

            {createNewLocation ? (
              <div className="space-y-2">
                <Input
                  name="newLocationName"
                  placeholder="New Location Name"
                  required
                />
                <select
                  name="newLocationType"
                  className="border rounded-md p-2 w-full"
                  required
                >
                  <option value="">Select type</option>
                  {LOCATION_TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                      className="dark:text-gray-400"
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <select
                name="locationId"
                className="border rounded-md p-2 w-full"
                required
              >
                <option value="" className="dark:text-gray-400">
                  Select a location
                </option>
                {locations.map((loc) => (
                  <option
                    key={loc.id}
                    value={loc.id}
                    className="dark:text-gray-400"
                  >
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
