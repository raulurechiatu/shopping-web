"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "install-banner-dismissed";

// iOS never lets an installed PWA capture links (no manifest setting or API
// changes that) — the only way to get people into the home-screen app
// instead of a browser tab is this nudge, and even then it's a manual
// "Add to Home Screen" step since iOS has no beforeinstallprompt either.
export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Private browsing etc. — just skip the nudge rather than risk it
      // reappearing every load with no way to dismiss it for good.
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isIOS && !isStandalone) setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Nothing to persist — it just won't stay dismissed next visit.
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-16 z-50 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <span className="shrink-0 text-lg">📲</span>
      <p className="flex-1">
        Install this app for a better experience: tap <span className="font-medium">Share</span>, then{" "}
        <span className="font-medium">Add to Home Screen</span>.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 touch-manipulation rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        ✕
      </button>
    </div>
  );
}
