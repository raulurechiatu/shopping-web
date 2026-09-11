"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import type { CatalogItem, ShoppingList } from "@/lib/types";

export default function ManageItemsView({
  list,
  initialCatalog,
}: {
  list: ShoppingList;
  initialCatalog: CatalogItem[];
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`list_item_catalog_manage:${list.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_item_catalog", filter: `list_id=eq.${list.id}` },
        (payload) => {
          setCatalog((current) => {
            if (payload.eventType === "DELETE") {
              const removed = payload.old as CatalogItem;
              return current.filter((c) => c.id !== removed.id);
            }
            const incoming = payload.new as CatalogItem;
            const withoutIncoming = current.filter((c) => c.id !== incoming.id);
            return [...withoutIncoming, incoming].sort((a, b) => a.name.localeCompare(b.name));
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [list.id]);

  async function toggle(item: CatalogItem, field: "is_favorite" | "is_pantry") {
    const nextValue = !item[field];
    setCatalog((current) => current.map((c) => (c.id === item.id ? { ...c, [field]: nextValue } : c)));
    const supabase = createClient();
    const { error } = await supabase
      .from("list_item_catalog")
      .update({ [field]: nextValue })
      .eq("id", item.id);
    if (error) {
      setCatalog((current) => current.map((c) => (c.id === item.id ? item : c)));
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-0 py-0 sm:px-6 sm:py-10 dark:bg-[#14171c]">
      <div className="relative mx-auto min-h-screen w-full max-w-2xl bg-white shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl dark:bg-gray-900">
        <header className="border-b border-gray-200 px-5 pt-6 pb-4 dark:border-gray-700">
          <Link
            href={`/lists/${list.id}`}
            className="mb-2 inline-flex touch-manipulation items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.56l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 111.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            {list.name}
          </Link>
          <h1 className="font-script text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Items</h1>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Mark items you usually buy as favorites, and what you already have at home.
          </p>
        </header>

        <main className="px-5 py-5">
          {catalog.length === 0 ? (
            <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
              Nothing here yet — items show up once you&apos;ve added them to the list.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {catalog.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate text-base text-gray-900 dark:text-gray-100">
                    <span className="mr-1.5">{getItemIcon(item.name)}</span>
                    {item.name}
                  </span>
                  <button
                    onClick={() => toggle(item, "is_pantry")}
                    aria-label={item.is_pantry ? "Remove from have at home" : "Mark as have at home"}
                    className={`touch-manipulation rounded-full p-3 text-lg ${
                      item.is_pantry
                        ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                        : "text-gray-300 hover:bg-gray-50 dark:text-gray-600 dark:hover:bg-gray-800"
                    }`}
                  >
                    🏠
                  </button>
                  <button
                    onClick={() => toggle(item, "is_favorite")}
                    aria-label={item.is_favorite ? "Remove from favorites" : "Mark as favorite"}
                    className={`touch-manipulation rounded-full p-3 text-lg ${
                      item.is_favorite
                        ? "text-amber-500"
                        : "text-gray-300 hover:bg-gray-50 dark:text-gray-600 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.is_favorite ? "★" : "☆"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
