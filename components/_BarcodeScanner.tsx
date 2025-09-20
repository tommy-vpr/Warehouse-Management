// components/BarcodeScanner.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";

// Import ZXing library
import {
  BrowserMultiFormatReader,
  NotFoundException,
  ChecksumException,
  FormatException,
} from "@zxing/library";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  expectedFormat?: string;
  title?: string;
  placeholder?: string;
  continuous?: boolean; // Whether to continue scanning after successful read
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  expectedFormat = "any",
  title = "Scan Barcode",
  placeholder = "Point camera at barcode or enter manually",
  continuous = false,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [manualEntry, setManualEntry] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamera, setCurrentCamera] = useState(0);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");

  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  // Initialize code reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  // Sound effects
  const playSuccessSound = useCallback(() => {
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
  }, [soundEnabled]);

  const playErrorSound = useCallback(() => {
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
  }, [soundEnabled]);

  // Get available cameras
  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setCameras(videoDevices);

      // Prefer back camera for barcode scanning
      const backCameraIndex = videoDevices.findIndex(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
      );

      if (backCameraIndex !== -1) {
        setCurrentCamera(backCameraIndex);
      }
    } catch (error) {
      console.error("Error getting cameras:", error);
      setCameraError("Unable to access camera devices");
    }
  };

  // Start camera and scanning
  const startCamera = async () => {
    try {
      setCameraError("");
      setScanStatus("idle");

      if (!codeReaderRef.current) return;

      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const deviceId = cameras[currentCamera]?.deviceId;

      // Start video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCamera(true);
        setIsScanning(true);
        scanningRef.current = true;

        // Start barcode scanning
        startBarcodeDetection();
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        "Camera access denied or unavailable. Please check permissions."
      );
      setHasCamera(false);
      setShowManualInput(true);
      playErrorSound();
    }
  };

  // Start barcode detection using ZXing
  const startBarcodeDetection = useCallback(() => {
    if (!codeReaderRef.current || !videoRef.current || !scanningRef.current)
      return;

    const detectBarcode = async () => {
      try {
        if (!scanningRef.current) return;

        setScanStatus("scanning");

        // Use ZXing to decode from video element
        const result = await codeReaderRef.current.decodeOnceFromVideoDevice(
          cameras[currentCamera]?.deviceId,
          videoRef.current
        );

        const barcode = result.getText();
        const now = Date.now();

        // Prevent duplicate scans within 2 seconds
        if (now - lastScanTime < 2000) {
          setTimeout(detectBarcode, 100);
          return;
        }

        setLastScanTime(now);
        setScanCount((prev) => prev + 1);
        setScanStatus("success");

        // Validate barcode format if specified
        if (
          expectedFormat !== "any" &&
          !validateBarcodeFormat(barcode, expectedFormat)
        ) {
          setScanStatus("error");
          playErrorSound();
          setCameraError(`Invalid format. Expected: ${expectedFormat}`);

          if (continuous) {
            setTimeout(() => {
              setCameraError("");
              setScanStatus("scanning");
              setTimeout(detectBarcode, 500);
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

        // Flash the screen briefly
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw current frame
            ctx.drawImage(video, 0, 0);

            // Add green overlay for success
            ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }

        // Call the callback
        onScan(barcode);

        if (!continuous) {
          // Close scanner after successful scan
          setTimeout(() => {
            onClose();
          }, 500);
        } else {
          // Continue scanning after brief pause
          setTimeout(() => {
            if (scanningRef.current) {
              setScanStatus("scanning");
              setTimeout(detectBarcode, 100);
            }
          }, 1000);
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          // No barcode found, continue scanning
          if (scanningRef.current) {
            setScanStatus("scanning");
            setTimeout(detectBarcode, 100);
          }
        } else if (
          error instanceof ChecksumException ||
          error instanceof FormatException
        ) {
          // Invalid barcode format, continue scanning
          setScanStatus("error");
          setTimeout(() => {
            if (scanningRef.current) {
              setScanStatus("scanning");
              setTimeout(detectBarcode, 200);
            }
          }, 500);
        } else {
          console.error("Barcode detection error:", error);
          setScanStatus("error");
          setCameraError(
            "Error reading barcode. Try adjusting position and lighting."
          );
          playErrorSound();

          // Retry after error
          setTimeout(() => {
            if (scanningRef.current) {
              setCameraError("");
              setScanStatus("scanning");
              setTimeout(detectBarcode, 1000);
            }
          }, 2000);
        }
      }
    };

    // Start detection
    setTimeout(detectBarcode, 500);
  }, [
    cameras,
    currentCamera,
    expectedFormat,
    lastScanTime,
    continuous,
    onScan,
    onClose,
    playSuccessSound,
    playErrorSound,
  ]);

  // Stop camera and scanning
  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setIsScanning(false);
    setScanStatus("idle");

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (error) {
        console.warn("Error resetting code reader:", error);
      }
    }
  }, []);

  // Toggle flashlight
  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        const capabilities = track.getCapabilities?.();
        if (capabilities?.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn } as any],
          });
          setFlashlightOn(!flashlightOn);
        }
      } catch (error) {
        console.warn("Flashlight not supported:", error);
      }
    }
  };

  // Switch camera
  const switchCamera = () => {
    if (cameras.length > 1) {
      setCurrentCamera((prev) => (prev + 1) % cameras.length);
    }
  };

  // Validate barcode format
  const validateBarcodeFormat = (barcode: string, format: string): boolean => {
    switch (format.toUpperCase()) {
      case "UPC":
        return /^\d{12}$/.test(barcode);
      case "EAN":
        return /^\d{13}$/.test(barcode);
      case "CODE128":
        return barcode.length >= 6;
      case "CODE39":
        return /^[A-Z0-9\-\.\s\$\/\+\%\*]+$/.test(barcode);
      default:
        return true;
    }
  };

  const handleManualSubmit = () => {
    if (manualEntry.trim()) {
      const barcode = manualEntry.trim();

      if (
        expectedFormat !== "any" &&
        !validateBarcodeFormat(barcode, expectedFormat)
      ) {
        setCameraError(`Invalid format. Expected: ${expectedFormat}`);
        playErrorSound();
        return;
      }

      playSuccessSound();
      onScan(barcode);
      onClose();
    }
  };

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      getCameras().then(() => {
        startCamera();
      });
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen, currentCamera]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              {getScanStatusIcon()}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Camera Controls */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {cameras.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                disabled={!isScanning}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Switch ({cameras.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFlashlight}
              disabled={!isScanning}
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
          {hasCamera && !cameraError && (
            <div className="relative mb-4">
              <video
                ref={videoRef}
                className={`w-full h-80 object-cover rounded border-2 ${getScanStatusColor()}`}
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover rounded"
                style={{
                  opacity: scanStatus === "success" ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  {/* Target frame */}
                  <div
                    className={`w-64 h-40 border-2 ${getScanStatusColor()} bg-transparent relative`}
                  >
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

          {/* Error Message with Action Buttons */}
          {cameraError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 mb-3">{cameraError}</p>

                  {cameraError.includes("denied") && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-500">To fix this:</p>
                      <ol className="text-xs text-red-500 list-decimal list-inside space-y-1 ml-2">
                        <li>
                          Click the camera/lock icon in your browser's address
                          bar
                        </li>
                        <li>Change Camera permission to "Allow"</li>
                        <li>Refresh this page</li>
                      </ol>

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCameraError("");
                            getCameras().then(() => startCamera());
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
                            setCameraError("");
                          }}
                        >
                          <Keyboard className="w-3 h-3 mr-1" />
                          Enter Manually
                        </Button>
                      </div>
                    </div>
                  )}

                  {cameraError.includes("already in use") && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCameraError("");
                          setTimeout(() => {
                            getCameras().then(() => startCamera());
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
          {(showManualInput || !hasCamera) && (
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
                <span>
                  Camera: {cameras[currentCamera]?.label.substring(0, 20)}...
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
