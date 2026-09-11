"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDialog } from "@/lib/DialogProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import type { UnitSystem } from "@/lib/unitConversion";

const OPTIONS: { value: UnitSystem; label: string; icon: string }[] = [
  { value: "metric", label: "Metric", icon: "📏" },
  { value: "imperial", label: "Imperial", icon: "🇺🇸" },
];

export default function UnitsPreference({ initialUnits }: { initialUnits: UnitSystem | null }) {
  const { alertDialog } = useDialog();
  const requireOnline = useOnlineGuard();
  const [units, setUnits] = useState<UnitSystem | null>(initialUnits);
  const [saving, setSaving] = useState(false);

  async function handleSelect(value: UnitSystem) {
    if (value === units || saving) return;
    if (!(await requireOnline())) return;

    const previous = units;
    setUnits(value);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ preferred_units: value }).eq("id", user?.id);

    if (error) {
      setUnits(previous);
      await alertDialog(error.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex gap-2 rounded-lg bg-gray-100 p-1 text-sm font-medium dark:bg-gray-800">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={saving}
            className={`flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-md py-2 disabled:opacity-60 ${
              units === opt.value
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <span>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Recipe ingredient quantities are auto-converted for display where possible (e.g. oz to ml).
      </p>
    </div>
  );
}
