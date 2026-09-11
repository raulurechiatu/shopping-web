"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline caching just won't be available this session — not
        // worth surfacing to the user.
      });
    }
  }, []);

  return null;
}
