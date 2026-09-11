"use client";

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@/lib/DialogProvider";

export function useOnlineStatus() {
  // Defaults to true so server-rendered markup and the first client
  // render match; corrected right after mount if actually offline.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

// Call before any mutation. Returns false (and shows a friendly dialog)
// instead of letting the request go out and fail, so a write attempt
// while offline never looks like a silent no-op.
export function useOnlineGuard() {
  const { alertDialog } = useDialog();
  return useCallback(async () => {
    if (navigator.onLine) return true;
    await alertDialog("You're offline. Connect to the internet to make changes.");
    return false;
  }, [alertDialog]);
}
