// components/LocationScanner.tsx
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
  MapPin,
} from "lucide-react";

import {
  BarcodeStringFormat,
  default as QRBarcodeScanner,
} from "react-qr-barcode-scanner";

interface LocationScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (locationBarcode: string) => void;
  expectedLocation?: string; // Optional: for validation
  title?: string;
  placeholder?: string;
  continuous?: boolean;
  stopStream?: boolean;
}

type ScanStatus = "idle" | "scanning" | "success" | "error" | "warning";

export function LocationScanner({
  isOpen,
  onClose,
  onScan,
  expectedLocation,
  title = "Scan Location",
  placeholder = "Scan location barcode or enter manually (e.g., 1-E-13-A-3-X)",
  continuous = false,
  stopStream = false,
}: LocationScannerProps) {
  const [manualEntry, setManualEntry] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
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

  const playWarningSound = () => {
    if (!soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.25
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.25);
    } catch (error) {
      console.warn("Audio context error:", error);
    }
  };

  // Validate location format (basic validation)
  const validateLocationFormat = (location: string): boolean => {
    // Accept format like: 1-E-13-A-3-X or similar warehouse location patterns
    // This is flexible - adjust regex based on your exact format requirements
    const locationPattern = /^[\dA-Z]+-[A-Z]+-\d+-[A-Z]+-\d+-[A-Z]$/i;
    return locationPattern.test(location);
  };

  // Handle location scan result
  const handleScan = (result: string) => {
    if (!result) return;

    const location = result.trim();
    const now = Date.now();

    // Prevent duplicate scans within 2 seconds
    if (now - lastScanTime < 2000) {
      return;
    }

    setLastScanTime(now);
    setScanCount((prev) => prev + 1);

    console.log("Location scanned:", location);

    // Basic format validation
    if (!validateLocationFormat(location)) {
      setScanStatus("error");
      setError(
        `Invalid location format. Expected format like: 1-E-13-A-3-X\nScanned: ${location}`
      );
      playErrorSound();

      if (continuous) {
        setTimeout(() => {
          setError("");
          setScanStatus("scanning");
        }, 3000);
      }
      return;
    }

    // Check if it matches expected location (if provided)
    if (expectedLocation && location !== expectedLocation) {
      setScanStatus("warning");
      setError(
        `Wrong location!\nExpected: ${expectedLocation}\nScanned: ${location}`
      );
      playWarningSound();

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      if (continuous) {
        setTimeout(() => {
          setError("");
          setScanStatus("scanning");
        }, 3000);
      }
      return;
    }

    // Success!
    setScanStatus("success");
    playSuccessSound();

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    onScan(location);

    if (!continuous) {
      setTimeout(() => {
        handleClose();
      }, 500);
    } else {
      setTimeout(() => {
        setScanStatus("scanning");
      }, 1000);
    }
  };

  // Handle scan error
  const handleError = (error: any) => {
    console.error("Location scan error:", error);
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

    setTimeout(() => {
      setError("");
      setScanStatus("idle");
    }, 3000);
  };

  const handleManualSubmit = () => {
    if (manualEntry.trim()) {
      const location = manualEntry.trim();

      if (!validateLocationFormat(location)) {
        setError(`Invalid location format. Expected format like: 1-E-13-A-3-X`);
        playErrorSound();
        return;
      }

      if (expectedLocation && location !== expectedLocation) {
        setScanStatus("warning");
        setError(
          `Wrong location!\nExpected: ${expectedLocation}\nEntered: ${location}`
        );
        playWarningSound();
        return;
      }

      playSuccessSound();
      onScan(location);
      handleClose();
    }
  };

  const handleClose = () => {
    setLocalStopStream(true);
    setCameraActive(false);

    setTimeout(() => {
      onClose();
    }, 100);
  };

  const toggleFlashlight = () => {
    setFlashlightOn(!flashlightOn);
  };

  const getScanStatusColor = () => {
    switch (scanStatus) {
      case "success":
        return "border-green-500";
      case "error":
        return "border-red-500";
      case "warning":
        return "border-yellow-500";
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
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "scanning":
        return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-500" />;
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

          {/* Expected Location Display */}
          {expectedLocation && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Expected Location:
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {expectedLocation}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                      console.log("[DEBUG] Scanned location:", text);
                      handleScan(text);
                    }
                  }}
                  onError={handleError}
                  stopStream={localStopStream}
                  formats={[
                    BarcodeStringFormat.CODE_128,
                    BarcodeStringFormat.CODE_39,
                    BarcodeStringFormat.QR_CODE,
                  ]}
                  torch={flashlightOn}
                  facingMode="environment"
                  width="100%"
                  height={320}
                />
              </div>

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  <div className="w-64 h-40 border-2 border-transparent bg-transparent relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>

                    {scanStatus === "scanning" && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse"></div>
                    )}
                  </div>

                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                    {scanStatus === "scanning" && `Scanning... (${scanCount})`}
                    {scanStatus === "success" && "Location verified!"}
                    {scanStatus === "warning" && "Wrong location!"}
                    {scanStatus === "error" && "Scan error"}
                    {scanStatus === "idle" && "Position barcode in frame"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error/Warning Message */}
          {error && (
            <div
              className={`mb-4 p-4 rounded border ${
                scanStatus === "warning"
                  ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <div className="flex items-start">
                <AlertCircle
                  className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                    scanStatus === "warning"
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm whitespace-pre-line ${
                      scanStatus === "warning"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {error}
                  </p>

                  {error.includes("permission") && (
                    <div className="space-y-2 mt-3">
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
                onChange={(e) => setManualEntry(e.target.value.toUpperCase())}
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
                Submit Location
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>• Position location barcode in the frame</p>
            <p>• Ensure good lighting for best results</p>
            <p>• Hold steady until scan completes</p>
            <p>
              • Expected format: <strong>W-A-B-T-S-B</strong> (e.g.,
              1-E-13-A-3-X)
            </p>
          </div>

          {/* Stats */}
          {scanCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Scans attempted: {scanCount}</span>
                <span>Format: CODE_128, CODE_39</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
