"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Camera } from "lucide-react";

interface OrderImageUploaderProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  existingImages?: Array<{
    id: string;
    url: string;
    createdAt: string;
  }>;
  onUploadSuccess?: () => void;
  compact?: boolean;
  title?: string;
  description?: string;
}

export default function OrderImageUploader({
  orderId,
  orderNumber,
  customerName,
  existingImages = [],
  onUploadSuccess,
  compact = false,
  title = "Upload image(s)",
  description,
}: OrderImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(existingImages);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Separate existing from newly uploaded
  const existingPhotoIds = existingImages.map((img) => img.id);
  const existingPhotos = images.filter((img) =>
    existingPhotoIds.includes(img.id)
  );
  const newPhotos = images.filter((img) => !existingPhotoIds.includes(img.id));

  const handleUpload = async (file: File) => {
    console.log("Starting upload:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", orderId);
    formData.append("reference", orderNumber);
    formData.append("customerName", customerName);

    console.log("Uploading with:", { orderId, orderNumber, customerName });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", res.status);

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(
          "Server error: Response is not JSON. Check browser console for details."
        );
      }

      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        throw new Error(
          data.error || `Upload failed with status ${res.status}`
        );
      }

      if (data.image) {
        console.log("Upload successful:", data.image);
        setImages((prev) => [...prev, data.image]);
        onUploadSuccess?.();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      const res = await fetch(`/api/upload/${imageId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete image");

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div
      className={
        compact
          ? ""
          : "bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border"
      }
    >
      {/* Existing Photos Section */}
      {existingPhotos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Current Order Photos ({existingPhotos.length})
            </h3>
          </div>
          <div
            className={`grid ${
              compact
                ? "grid-cols-4 gap-2"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            }`}
          >
            {existingPhotos.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg overflow-hidden border dark:border-border bg-gray-50 dark:bg-gray-800 aspect-square"
              >
                <img
                  src={img.url}
                  alt="Order"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("❌ Image failed to load:", img.url);
                  }}
                  onLoad={() => {
                    console.log("✅ Image loaded successfully:", img.url);
                  }}
                />

                {/* Timestamp */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white">
                    {new Date(img.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t dark:border-border mt-4 pt-4"></div>
        </div>
      )}

      {/* Upload New Photos Section */}
      <div
        className={`flex items-center justify-between ${
          compact ? "mb-3" : "mb-4"
        }`}
      >
        <div>
          <h2
            className={`${
              compact ? "text-base" : "text-lg"
            } font-semibold flex items-center gap-2`}
          >
            <ImageIcon className={compact ? "w-4 h-4" : "w-5 h-5"} />
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {newPhotos.length} new
        </span>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile: Show Camera Button prominently */}
      {isMobile ? (
        <div className="space-y-3">
          {/* Camera Button - Primary */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className={`
              w-full border-2 border-dashed rounded-lg ${
                compact ? "p-4" : "p-6"
              }
              transition-all duration-200
              ${
                uploading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }
              border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-600
            `}
          >
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Uploading...
                  </p>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-blue-600" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    Take Photo
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Opens camera to capture image
                  </p>
                </>
              )}
            </div>
          </button>

          {/* File Browser Button - Secondary */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`
              w-full border-2 border-dashed rounded-lg ${
                compact ? "p-3" : "p-4"
              }
              transition-colors
              ${
                uploading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-gray-400 dark:hover:border-gray-500"
              }
              border-gray-300 dark:border-gray-600
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Or browse files
              </p>
            </div>
          </button>
        </div>
      ) : (
        /* Desktop: Drag & Drop Area */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg ${
              compact ? "p-4" : "p-8"
            } text-center transition-colors
            ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }
            ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center gap-2 pointer-events-none">
            {uploading ? (
              <>
                <Loader2
                  className={`${
                    compact ? "w-8 h-8" : "w-10 h-10"
                  } text-blue-600 animate-spin`}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Upload
                  className={`${
                    compact ? "w-8 h-8" : "w-10 h-10"
                  } text-gray-400`}
                />
                <p
                  className={`${
                    compact ? "text-xs" : "text-sm"
                  } font-medium text-gray-700 dark:text-gray-300`}
                >
                  {dragActive
                    ? "Drop image here"
                    : "Drag & drop image here or click to browse"}
                </p>
                {!compact && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports: JPG, PNG, GIF (max 10MB)
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Newly Uploaded Images Gallery */}
      {newPhotos.length > 0 && (
        <div className={compact ? "mt-3" : "mt-6"}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Just Uploaded ({newPhotos.length})
          </h3>
          <div
            className={`grid ${
              compact
                ? "grid-cols-4 gap-2"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            }`}
          >
            {newPhotos.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg overflow-hidden border dark:border-border bg-gray-50 dark:bg-gray-800 aspect-square"
              >
                <img
                  src={img.url}
                  alt="Order"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("❌ Image failed to load:", img.url);
                  }}
                  onLoad={() => {
                    console.log("✅ Image loaded successfully:", img.url);
                  }}
                />

                {/* Overlay with delete button */}
                <div className="absolute inset-0 transition-all duration-200 flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-all transform scale-75 group-hover:scale-100"
                    title="Delete image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Timestamp */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(img.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

// interface OrderImageUploaderProps {
//   orderId: string;
//   orderNumber: string;
//   customerName: string;
//   existingImages?: Array<{
//     id: string;
//     url: string;
//     createdAt: string;
//   }>;
//   onUploadSuccess?: () => void;
//   compact?: boolean;
//   title?: string; // ✅ NEW - Custom title
//   description?: string; // ✅ NEW - Custom description
// }

// export default function OrderImageUploader({
//   orderId,
//   orderNumber,
//   customerName,
//   existingImages = [],
//   onUploadSuccess,
//   compact = false,
//   title = "Upload image(s)",
//   description,
// }: OrderImageUploaderProps) {
//   const [uploading, setUploading] = useState(false);
//   const [images, setImages] = useState(existingImages);
//   const [error, setError] = useState<string | null>(null);
//   const [dragActive, setDragActive] = useState(false);

//   // Separate existing from newly uploaded
//   const existingPhotoIds = existingImages.map((img) => img.id);
//   const existingPhotos = images.filter((img) =>
//     existingPhotoIds.includes(img.id)
//   );
//   const newPhotos = images.filter((img) => !existingPhotoIds.includes(img.id));

//   const handleUpload = async (file: File) => {
//     console.log("Starting upload:", {
//       fileName: file.name,
//       fileType: file.type,
//       fileSize: file.size,
//     });

//     if (!file.type.startsWith("image/")) {
//       setError("Please upload an image file");
//       return;
//     }

//     // Check file size (10MB limit)
//     if (file.size > 10 * 1024 * 1024) {
//       setError("File size must be less than 10MB");
//       return;
//     }

//     setUploading(true);
//     setError(null);

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("orderId", orderId);
//     formData.append("reference", orderNumber);
//     formData.append("customerName", customerName);

//     console.log("Uploading with:", { orderId, orderNumber, customerName });

//     try {
//       const res = await fetch("/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       console.log("Response status:", res.status);
//       console.log(
//         "Response headers:",
//         Object.fromEntries(res.headers.entries())
//       );

//       // Check if response is JSON
//       const contentType = res.headers.get("content-type");
//       if (!contentType || !contentType.includes("application/json")) {
//         const text = await res.text();
//         console.error("Non-JSON response:", text.substring(0, 500));
//         throw new Error(
//           "Server error: Response is not JSON. Check browser console for details."
//         );
//       }

//       const data = await res.json();
//       console.log("Response data:", data);

//       if (!res.ok) {
//         throw new Error(
//           data.error || `Upload failed with status ${res.status}`
//         );
//       }

//       if (data.image) {
//         console.log("Upload successful:", data.image);
//         setImages((prev) => [...prev, data.image]);
//         onUploadSuccess?.();
//       }
//     } catch (err: any) {
//       console.error("Upload error:", err);
//       setError(err.message || "Upload failed");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) handleUpload(file);
//   };

//   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     const file = e.dataTransfer.files?.[0];
//     if (file) handleUpload(file);
//   };

//   const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleDelete = async (imageId: string) => {
//     if (!confirm("Delete this image?")) return;

//     try {
//       const res = await fetch(`/api/upload/${imageId}`, {
//         method: "DELETE",
//       });

//       if (!res.ok) throw new Error("Failed to delete image");

//       setImages((prev) => prev.filter((img) => img.id !== imageId));
//     } catch (err: any) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div
//       className={
//         compact
//           ? ""
//           : "bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border"
//       }
//     >
//       {/* Existing Photos Section - Show if any exist */}
//       {existingPhotos.length > 0 && (
//         <div className="mb-6">
//           <div className="flex items-center justify-between mb-3">
//             <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
//               <ImageIcon className="w-4 h-4" />
//               Current Order Photos ({existingPhotos.length})
//             </h3>
//           </div>
//           <div
//             className={`grid ${
//               compact
//                 ? "grid-cols-4 gap-2"
//                 : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
//             }`}
//           >
//             {existingPhotos.map((img) => (
//               <div
//                 key={img.id}
//                 className="relative group rounded-lg overflow-hidden border dark:border-border bg-gray-50 dark:bg-gray-800 aspect-square"
//               >
//                 <img
//                   src={img.url}
//                   alt="Order"
//                   className="w-full h-full object-cover"
//                   onError={(e) => {
//                     console.error("❌ Image failed to load:", img.url);
//                     console.error("Error event:", e);
//                   }}
//                   onLoad={() => {
//                     console.log("✅ Image loaded successfully:", img.url);
//                   }}
//                 />

//                 {/* Timestamp */}
//                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
//                   <p className="text-xs text-white">
//                     {new Date(img.createdAt).toLocaleDateString()}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <div className="border-t dark:border-border mt-4 pt-4"></div>
//         </div>
//       )}

//       {/* Upload New Photos Section */}
//       <div
//         className={`flex items-center justify-between ${
//           compact ? "mb-3" : "mb-4"
//         }`}
//       >
//         <div>
//           <h2
//             className={`${
//               compact ? "text-base" : "text-lg"
//             } font-semibold flex items-center gap-2`}
//           >
//             <ImageIcon className={compact ? "w-4 h-4" : "w-5 h-5"} />
//             {title}
//           </h2>
//           {description && (
//             <p className="text-xs text-muted-foreground mt-0.5">
//               {description}
//             </p>
//           )}
//         </div>
//         <span className="text-sm text-gray-600 dark:text-gray-400">
//           {newPhotos.length} new
//         </span>
//       </div>

//       {error && (
//         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-center justify-between">
//           <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
//           <button
//             onClick={() => setError(null)}
//             className="text-red-600 hover:text-red-800"
//           >
//             <X className="w-4 h-4" />
//           </button>
//         </div>
//       )}

//       {/* Upload Area */}
//       <div
//         onDragEnter={handleDrag}
//         onDragLeave={handleDrag}
//         onDragOver={handleDrag}
//         onDrop={handleDrop}
//         className={`
//           relative border-2 border-dashed rounded-lg ${
//             compact ? "p-4" : "p-8"
//           } text-center transition-colors
//           ${
//             dragActive
//               ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
//               : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
//           }
//           ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
//         `}
//       >
//         <input
//           type="file"
//           accept="image/*"
//           onChange={handleFileChange}
//           disabled={uploading}
//           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//         />

//         <div className="flex flex-col items-center gap-2">
//           {uploading ? (
//             <>
//               <Loader2
//                 className={`${
//                   compact ? "w-8 h-8" : "w-10 h-10"
//                 } text-blue-600 animate-spin`}
//               />
//               <p className="text-sm text-gray-600 dark:text-gray-400">
//                 Uploading...
//               </p>
//             </>
//           ) : (
//             <>
//               <Upload
//                 className={`${compact ? "w-8 h-8" : "w-10 h-10"} text-gray-400`}
//               />
//               <p
//                 className={`${
//                   compact ? "text-xs" : "text-sm"
//                 } font-medium text-gray-700 dark:text-gray-300`}
//               >
//                 {compact
//                   ? "Upload photo"
//                   : "Drop image here or click to browse"}
//               </p>
//               {!compact && (
//                 <p className="text-xs text-gray-500 dark:text-gray-400">
//                   Supports: JPG, PNG, GIF (max 10MB)
//                 </p>
//               )}
//             </>
//           )}
//         </div>
//       </div>

//       {/* Newly Uploaded Images Gallery */}
//       {newPhotos.length > 0 && (
//         <div className={compact ? "mt-3" : "mt-6"}>
//           <h3 className="text-sm font-medium text-muted-foreground mb-2">
//             Just Uploaded ({newPhotos.length})
//           </h3>
//           <div
//             className={`grid ${
//               compact
//                 ? "grid-cols-4 gap-2"
//                 : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
//             }`}
//           >
//             {newPhotos.map((img) => (
//               <div
//                 key={img.id}
//                 className="relative group rounded-lg overflow-hidden border dark:border-border bg-gray-50 dark:bg-gray-800 aspect-square"
//               >
//                 <img
//                   src={img.url}
//                   alt="Order"
//                   className="w-full h-full object-cover"
//                   onError={(e) => {
//                     console.error("❌ Image failed to load:", img.url);
//                     console.error("Error event:", e);
//                   }}
//                   onLoad={() => {
//                     console.log("✅ Image loaded successfully:", img.url);
//                   }}
//                 />

//                 {/* Overlay with delete button */}
//                 <div className="absolute inset-0 transition-all duration-200 flex items-center justify-center">
//                   <button
//                     onClick={() => handleDelete(img.id)}
//                     className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-all transform scale-75 group-hover:scale-100"
//                     title="Delete image"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 </div>

//                 {/* Timestamp */}
//                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
//                   <p className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
//                     {new Date(img.createdAt).toLocaleDateString()}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
