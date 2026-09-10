"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/lists",
    label: "Lists",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
        />
        <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/recipes",
    label: "Recipes",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path
          d="M12 6.5c-1.2-1.3-3-2-5-2-1 0-2 .2-3 .5v13c1-.3 2-.5 3-.5 2 0 3.8.7 5 2 1.2-1.3 3-2 5-2 1 0 2 .2 3 .5v-13c-1-.3-2-.5-3-.5-2 0-3.8.7-5 2z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinejoin="round"
        />
        <path d="M12 6.5V19" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <path
          d="M5 19c1.3-3 4-4.5 7-4.5s5.7 1.5 7 4.5"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 touch-manipulation flex-col items-center gap-0.5 py-2.5 ${
                active ? "text-[#2b3a55]" : "text-gray-400"
              }`}
            >
              {tab.icon(active)}
              <span className={`text-[11px] ${active ? "font-medium" : ""}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
