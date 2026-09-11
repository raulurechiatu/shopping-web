"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/components/navTabs";

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-gray-200 bg-white sm:block">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/lists" className="font-script text-xl font-bold text-gray-900">
          Shopping List
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium [&_svg]:h-4 [&_svg]:w-4 ${
                  active ? "bg-[#2b3a55] text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.icon(active)}
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
