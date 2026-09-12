"use client";

import { useEffect } from "react";

// Only catches errors thrown by the root layout itself (fonts, providers,
// the theme-init script) — anything inside the (app) route group is caught
// by its own error.tsx instead, which keeps the nav bars visible. This one
// replaces the entire document, so it needs its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f6f3] px-6 text-center">
        <p className="text-4xl">🫠</p>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="max-w-sm text-sm text-gray-500">The app hit a snag loading. Try refreshing the page.</p>
        <button
          onClick={reset}
          className="touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42]"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
