"use client";

import { useOnlineStatus } from "@/lib/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[80] bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white sm:top-14">
      📡 You&apos;re offline — showing your last synced data
    </div>
  );
}
