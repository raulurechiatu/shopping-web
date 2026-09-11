"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/components/navTabs";
import { useCurrentUser } from "@/lib/useCurrentUser";
import UserAvatar from "@/components/UserAvatar";

export default function BottomNav() {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {NAV_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isAccount = tab.href === "/account";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 touch-manipulation flex-col items-center gap-0.5 py-2.5 ${
                active ? "text-[#2b3a55]" : "text-gray-400"
              }`}
            >
              {isAccount ? (
                <UserAvatar user={user} size={24} className={active ? "ring-2 ring-[#2b3a55]" : ""} />
              ) : (
                tab.icon(active)
              )}
              <span className={`text-[11px] ${active ? "font-medium" : ""}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
