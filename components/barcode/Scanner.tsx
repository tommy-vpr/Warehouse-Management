// components/barcode/Scanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (scannerRef.current && !isScanning) {
      setIsScanning(true);

      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: 480,
              height: 320,
              facingMode: "environment",
            },
          },
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
            ],
          },
        },
        (err) => {
          if (err) {
            console.error(err);
            return;
          }
          Quagga.start();
        }
      );

      Quagga.onDetected((data) => {
        onScan(data.codeResult.code);
        Quagga.stop();
        setIsScanning(false);
      });
    }

    return () => {
      if (isScanning) {
        Quagga.stop();
        setIsScanning(false);
      }
    };
  }, [onScan, isScanning]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Scan Barcode</h3>

        <div ref={scannerRef} className="mb-4 border rounded" />

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Or enter manually:</label>
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter UPC/SKU"
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
