// components/BarcodeScanner.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Camera,
  X,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  Volume2,
  VolumeX,
  Keyboard,
  AlertCircle,
  CheckCircle,
  Zap,
  CameraOff,
} from "lucide-react";

// Import react-qr-barcode-scanner
import {
  BarcodeStringFormat,
  default as QRBarcodeScanner,
} from "react-qr-barcode-scanner";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  expectedFormat?: string;
  title?: string;
  placeholder?: string;
  continuous?: boolean;
  stopStream?: boolean;
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  expectedFormat = "any",
  title = "Scan Barcode",
  placeholder = "Point camera at barcode or enter manually",
  continuous = false,
  stopStream = false, // <-- this is a prop
}: BarcodeScannerProps) {
  const [manualEntry, setManualEntry] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  // 🔑 NEW: internal mirror state for stopStream
  const [localStopStream, setLocalStopStream] = useState(stopStream);
  useEffect(() => setLocalStopStream(stopStream), [stopStream]);

  useEffect(() => {
    if (isOpen && !stopStream) {
      setCameraActive(true);
      setScanStatus("scanning");
    } else {
      setCameraActive(false);
    }
  }, [isOpen, stopStream]);

  // Sound effects
  const playSuccessSound = () => {
    if (!soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.2
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn("Audio context error:", error);
    }
  };

  const playErrorSound = () => {
    if (!soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn("Audio context error:", error);
    }
  };

  // Validate barcode format
  const validateBarcodeFormat = (barcode: string, format: string): boolean => {
    switch (format.toUpperCase()) {
      case "UPC":
      case "UPC-A":
        return /^\d{12}$/.test(barcode);
      case "UPC-E":
        return /^\d{8}$/.test(barcode);
      case "EAN":
      case "EAN-13":
        return /^\d{13}$/.test(barcode);
      case "EAN-8":
        return /^\d{8}$/.test(barcode);
      case "CODE128":
        return barcode.length >= 6;
      case "CODE39":
        return /^[A-Z0-9\-\.\s\$\/\+\%\*]+$/.test(barcode);
      default:
        return true;
    }
  };

  // Handle barcode scan result
  const handleScan = (result: any) => {
    if (!result) return;

    const barcode = result.text || result;
    const now = Date.now();

    // Prevent duplicate scans within 2 seconds
    if (now - lastScanTime < 2000) {
      return;
    }

    setLastScanTime(now);
    setScanCount((prev) => prev + 1);
    setScanStatus("success");

    console.log("Barcode scanned:", barcode);

    // Validate barcode format if specified
    if (
      expectedFormat !== "any" &&
      !validateBarcodeFormat(barcode, expectedFormat)
    ) {
      setScanStatus("error");
      setError(`Invalid format. Expected: ${expectedFormat}`);
      playErrorSound();

      if (continuous) {
        setTimeout(() => {
          setError("");
          setScanStatus("scanning");
        }, 2000);
      }
      return;
    }

    // Success!
    playSuccessSound();

    // Vibrate on mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Call the callback
    onScan(barcode);

    if (!continuous) {
      // Close scanner after successful scan
      setTimeout(() => {
        handleClose();
      }, 500);
    } else {
      // Continue scanning after brief pause
      setTimeout(() => {
        setScanStatus("scanning");
      }, 1000);
    }
  };

  // Handle scan error
  const handleError = (error: any) => {
    console.error("Barcode scan error:", error);
    setScanStatus("error");

    let errorMessage = "Camera error occurred";

    if (
      error?.name === "NotAllowedError" ||
      error?.name === "PermissionDeniedError"
    ) {
      errorMessage =
        "Camera permission denied. Please allow camera access and try again.";
    } else if (error?.name === "NotFoundError") {
      errorMessage = "No camera found on this device.";
    } else if (error?.name === "NotReadableError") {
      errorMessage = "Camera is already in use by another application.";
    } else if (error?.message) {
      errorMessage = `Camera error: ${error.message}`;
    }

    setError(errorMessage);
    playErrorSound();

    // Auto-retry after 3 seconds
    setTimeout(() => {
      setError("");
      setScanStatus("idle");
    }, 3000);
  };

  const handleManualSubmit = () => {
    if (manualEntry.trim()) {
      const barcode = manualEntry.trim();

      if (
        expectedFormat !== "any" &&
        !validateBarcodeFormat(barcode, expectedFormat)
      ) {
        setError(`Invalid format. Expected: ${expectedFormat}`);
        playErrorSound();
        return;
      }

      playSuccessSound();
      onScan(barcode);
      handleClose();
    }
  };

  // Handle close with proper cleanup
  const handleClose = () => {
    setLocalStopStream(true);
    setCameraActive(false);

    // Small delay to ensure stream stops before closing
    setTimeout(() => {
      onClose();
    }, 100);
  };
  // Toggle flashlight (note: limited support in web browsers)
  const toggleFlashlight = () => {
    setFlashlightOn(!flashlightOn);
    // Note: Flashlight control in web browsers is very limited
    // This is more of a UI indicator than actual functionality
  };

  const getScanStatusColor = () => {
    switch (scanStatus) {
      case "success":
        return "border-green-500";
      case "error":
        return "border-red-500";
      case "scanning":
        return "border-blue-500";
      default:
        return "border-gray-300";
    }
  };

  const getScanStatusIcon = () => {
    switch (scanStatus) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "scanning":
        return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Camera className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get barcode formats based on expected format
  const getBarcodeFormats = (): BarcodeStringFormat[] => {
    switch (expectedFormat.toLowerCase()) {
      case "upc":
        return [BarcodeStringFormat.UPC_A, BarcodeStringFormat.UPC_E];
      case "upc-a":
        return [BarcodeStringFormat.UPC_A];
      case "upc-e":
        return [BarcodeStringFormat.UPC_E];
      case "ean":
        return [BarcodeStringFormat.EAN_13, BarcodeStringFormat.EAN_8];
      case "ean-13":
        return [BarcodeStringFormat.EAN_13];
      case "ean-8":
        return [BarcodeStringFormat.EAN_8];
      case "code128":
        return [BarcodeStringFormat.CODE_128];
      case "code39":
        return [BarcodeStringFormat.CODE_39];
      default:
        return [
          BarcodeStringFormat.UPC_A,
          BarcodeStringFormat.UPC_E,
          BarcodeStringFormat.EAN_13,
          BarcodeStringFormat.EAN_8,
          BarcodeStringFormat.CODE_128,
          BarcodeStringFormat.CODE_39,
        ];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              {getScanStatusIcon()}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Camera Controls */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFlashlight}
              disabled={!cameraActive}
            >
              {flashlightOn ? (
                <FlashlightOff className="w-4 h-4 mr-1" />
              ) : (
                <Flashlight className="w-4 h-4 mr-1" />
              )}
              Flash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 mr-1" />
              ) : (
                <VolumeX className="w-4 h-4 mr-1" />
              )}
              Sound
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <Keyboard className="w-4 h-4 mr-1" />
              Manual
            </Button>
          </div>

          {/* Camera View */}
          {cameraActive && !error && (
            <div className="relative mb-4">
              <div
                className={`rounded border-2 ${getScanStatusColor()} overflow-hidden`}
              >
                <QRBarcodeScanner
                  onUpdate={(err, result) => {
                    if (result) {
                      const text = result.getText();
                      console.log("[DEBUG] Scanned barcode:", text);
                      onScan(text); // ✅ only pass valid barcodes
                    } else if (err) {
                      // console.log("[DEBUG] Scanner error:", err); // ignore NotFoundException
                    }
                  }}
                  onError={handleError}
                  stopStream={localStopStream}
                  formats={getBarcodeFormats()}
                  torch={flashlightOn}
                  facingMode="environment"
                  width="100%"
                  height={320}
                />
              </div>

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  {/* Target frame */}
                  <div className="w-64 h-40 border-2 border-transparent bg-transparent relative">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>

                    {/* Scanning line animation */}
                    {scanStatus === "scanning" && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse"></div>
                    )}
                  </div>

                  {/* Status text */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                    {scanStatus === "scanning" && `Scanning... (${scanCount})`}
                    {scanStatus === "success" && "Barcode detected!"}
                    {scanStatus === "error" && "Scan error"}
                    {scanStatus === "idle" && "Position barcode in frame"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 mb-3">{error}</p>

                  {error.includes("permission") && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-500">To fix this:</p>
                      <ol className="text-xs text-red-500 list-decimal list-inside space-y-1 ml-2">
                        <li>
                          Click the camera icon in your browser's address bar
                        </li>
                        <li>Change Camera permission to "Allow"</li>
                        <li>Refresh this page or try again</li>
                      </ol>

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setError("");
                            setCameraActive(true);
                            setLocalStopStream(false);
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Try Again
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowManualInput(true);
                            setError("");
                          }}
                        >
                          <Keyboard className="w-3 h-3 mr-1" />
                          Enter Manually
                        </Button>
                      </div>
                    </div>
                  )}

                  {error.includes("already in use") && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTimeout(() => {
                            setError("");
                            setCameraActive(true);
                            setLocalStopStream(false);
                          }, 1000);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry in 1 second
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Input */}
          {(showManualInput || error) && (
            <div className="space-y-3">
              <Input
                placeholder={placeholder}
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
              />
              <Button
                onClick={handleManualSubmit}
                className="w-full"
                disabled={!manualEntry.trim()}
              >
                Submit Code
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p>• Position barcode clearly in the frame</p>
            <p>• Ensure good lighting</p>
            <p>• Hold steady until scan completes</p>
            {expectedFormat !== "any" && (
              <p>
                • Expected format: <strong>{expectedFormat}</strong>
              </p>
            )}
          </div>

          {/* Stats */}
          {scanCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Scans attempted: {scanCount}</span>
                <span>Format: {getBarcodeFormats().join(", ")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
