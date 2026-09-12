"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <p className="text-4xl">🫠</p>
      <h1 className="font-script text-2xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h1>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        This page hit a snag. Your data is fine — try again, or head back to your lists.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42]"
        >
          Try again
        </button>
        <Link
          href="/lists"
          className="touch-manipulation rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
        >
          Your Lists
        </Link>
      </div>
    </div>
  );
}
