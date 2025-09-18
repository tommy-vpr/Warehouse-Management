"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Scan, Search } from "lucide-react";

export default function InventoryView() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockInventory = [
    {
      id: 1,
      sku: "ABC-123",
      name: "Wireless Headphones",
      upc: "123456789012",
      location: "A1-B2",
      onHand: 45,
      reserved: 12,
      available: 33,
      lastCounted: "2024-01-15",
    },
    {
      id: 2,
      sku: "DEF-456",
      name: "Phone Case",
      upc: "234567890123",
      location: "B2-C1",
      onHand: 128,
      reserved: 8,
      available: 120,
      lastCounted: "2024-01-10",
    },
    {
      id: 3,
      sku: "GHI-789",
      name: "USB Cable",
      upc: "345678901234",
      location: "C1-A3",
      onHand: 89,
      reserved: 15,
      available: 74,
      lastCounted: "2024-01-12",
    },
  ];

  const filteredInventory = mockInventory.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.upc.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          <Button>
            <Scan className="w-4 h-4 mr-2" />
            Bulk Scan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Current Inventory</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by SKU, name, or UPC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 font-medium">
                    Product Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium">UPC</th>
                  <th className="text-left py-3 px-4 font-medium">Location</th>
                  <th className="text-right py-3 px-4 font-medium">On Hand</th>
                  <th className="text-right py-3 px-4 font-medium">Reserved</th>
                  <th className="text-right py-3 px-4 font-medium">
                    Available
                  </th>
                  <th className="text-left py-3 px-4 font-medium">
                    Last Counted
                  </th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{item.sku}</td>
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600">{item.upc}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{item.location}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">{item.onHand}</td>
                    <td className="py-3 px-4 text-right text-orange-600">
                      {item.reserved}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {item.available}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {item.lastCounted}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
