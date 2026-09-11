"use client";

import { useTheme, type ThemePreference } from "@/lib/ThemeProvider";

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "🖥️" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2 rounded-lg bg-gray-100 p-1 text-sm font-medium dark:bg-gray-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={`flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-md py-2 ${
            theme === opt.value
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <span>{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
