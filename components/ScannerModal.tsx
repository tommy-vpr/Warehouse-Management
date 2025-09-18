"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan } from "lucide-react";

export default function ScannerModal({ onClose }: { onClose: () => void }) {
  const [scannedCode, setScannedCode] = useState("");
  const [manualCode, setManualCode] = useState("");

  const handleScan = (code: string) => {
    setScannedCode(code);
    // Here you would typically look up the product by UPC/SKU
    alert(`Scanned: ${code}`);
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Quick Scan</h3>

        <div className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <Scan className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Camera scanner will appear here</p>
          <p className="text-sm text-gray-400">Requires camera permission</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Or enter manually:</label>
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter UPC or SKU"
              onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
              Submit
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
