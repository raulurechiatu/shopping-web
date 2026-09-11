"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/components/navTabs";
import { useCurrentUser, getDisplayName } from "@/lib/useCurrentUser";
import UserAvatar from "@/components/UserAvatar";

export default function TopBar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const primaryTabs = NAV_TABS.filter(
    (tab) => tab.href !== "/account" && (tab.href !== "/recipes" || !user?.isAnonymous),
  );
  const accountActive = pathname === "/account" || pathname.startsWith("/account/");

  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sm:block">
      <div className="mx-auto grid max-w-4xl grid-cols-3 items-center px-6 py-3">
        <Link href="/lists" className="font-script justify-self-start text-xl font-bold text-gray-900 dark:text-gray-100">
          Shopping List
        </Link>

        <nav className="flex items-center gap-1 justify-self-center">
          {primaryTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium [&_svg]:h-4 [&_svg]:w-4 ${
                  active ? "bg-[#2b3a55] text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {tab.icon(active)}
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/account"
          className={`flex items-center gap-1.5 justify-self-end rounded-full px-2.5 py-1.5 text-sm font-medium ${
            accountActive ? "bg-[#2b3a55] text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <UserAvatar user={user} size={22} className={accountActive ? "ring-2 ring-white/50" : ""} />
          {getDisplayName(user)}
        </Link>
      </div>
    </header>
  );
}
