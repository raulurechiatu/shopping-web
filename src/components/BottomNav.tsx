"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/components/navTabs";
import { useCurrentUser, getDisplayName } from "@/lib/useCurrentUser";
import UserAvatar from "@/components/UserAvatar";

export default function BottomNav() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const tabs = NAV_TABS.filter(
    (tab) => !["/recipes", "/items"].includes(tab.href) || !user?.isAnonymous,
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isAccount = tab.href === "/account";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 touch-manipulation flex-col items-center gap-0.5 py-2.5 ${
                active ? "text-[var(--accent-food)]" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {isAccount ? (
                <UserAvatar user={user} size={24} className={active ? "ring-2 ring-[var(--accent-food)]" : ""} />
              ) : (
                tab.icon(active)
              )}
              <span className={`text-[11px] ${active ? "font-medium" : ""}`}>
                {isAccount ? getDisplayName(user) : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
