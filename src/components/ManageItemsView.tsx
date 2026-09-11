"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import type { CatalogItem, ShoppingList } from "@/lib/types";

export default function ManageItemsView({
  lists,
  initialCatalog,
}: {
  lists: ShoppingList[];
  initialCatalog: CatalogItem[];
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);
  const [query, setQuery] = useState("");
  const listIds = useMemo(() => lists.map((l) => l.id), [lists]);
  const listNameById = useMemo(() => new Map(lists.map((l) => [l.id, l.name])), [lists]);

  useEffect(() => {
    if (listIds.length === 0) return;
    const supabase = createClient();
    const channels = listIds.map((listId) =>
      supabase
        .channel(`list_item_catalog_manage:${listId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "list_item_catalog", filter: `list_id=eq.${listId}` },
          (payload) => {
            setCatalog((current) => {
              if (payload.eventType === "DELETE") {
                const removedId = (payload.old as Partial<CatalogItem>)?.id;
                if (!removedId) return current;
                return current.filter((c) => c.id !== removedId);
              }
              const incoming = payload.new as CatalogItem | undefined;
              if (!incoming?.id) return current;
              const withoutIncoming = current.filter((c) => c.id !== incoming.id);
              return [...withoutIncoming, incoming];
            });
          },
        )
        .subscribe(),
    );

    return () => {
      for (const channel of channels) supabase.removeChannel(channel);
    };
  }, [listIds]);

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

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? catalog.filter((c) => c.name.toLowerCase().includes(trimmedQuery))
    : catalog;

  const groups = listIds
    .map((listId) => ({
      listId,
      listName: listNameById.get(listId) ?? "List",
      items: filtered
        .filter((c) => c.list_id === listId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col gap-6">
        <div>
          <h1 className="font-script text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Items</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Mark items you usually buy as favorites, and what you already have at home.
          </p>
        </div>

        {catalog.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search items..."
            className="font-hand w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        )}

        {catalog.length === 0 && (
          <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
            Nothing here yet — items show up once you&apos;ve added them to a list.
          </p>
        )}

        {catalog.length > 0 && filtered.length === 0 && (
          <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
            No items match &ldquo;{query}&rdquo;.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.listId} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
              {groups.length > 1 && (
                <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                  {group.listName}
                </p>
              )}
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {group.items.map((item) => (
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
