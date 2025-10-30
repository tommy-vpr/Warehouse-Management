// hooks/useTabNotification.ts
import { useEffect, useCallback } from "react";

const STORAGE_KEY = "wms-notification-count";
const BASE_TITLE = "WMS - Warehouse Management System";

export function useTabNotification() {
  const updateTitle = useCallback((count: number) => {
    // Update localStorage
    localStorage.setItem(STORAGE_KEY, count.toString());

    // Update title
    if (count > 0) {
      document.title = `(${count}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    // Notify other tabs
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: count.toString(),
      })
    );
  }, []);

  const getCount = useCallback((): number => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const count = e.newValue ? parseInt(e.newValue, 10) : 0;
        document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { updateTitle, getCount };
}
