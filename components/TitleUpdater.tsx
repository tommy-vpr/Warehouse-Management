// // components/TitleUpdater.tsx
// "use client";

// import { useEffect } from "react";
// import { usePathname } from "next/navigation";
// import { useNotificationStore } from "@/stores/notificationStore";

// export default function TitleUpdater() {
//   const pathname = usePathname();
//   const { updateTabTitle } = useNotificationStore();

//   // Update title on mount and pathname change
//   useEffect(() => {
//     updateTabTitle();
//   }, [pathname, updateTabTitle]);

//   // Update title when page becomes visible
//   useEffect(() => {
//     const handleVisibilityChange = () => {
//       if (document.visibilityState === "visible") {
//         updateTabTitle();
//       }
//     };

//     document.addEventListener("visibilitychange", handleVisibilityChange);
//     return () =>
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//   }, [updateTabTitle]);

//   return null; // This component doesn't render anything
// }
