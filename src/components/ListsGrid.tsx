"use client";

import { useState } from "react";
import ListRow from "@/components/ListRow";
import { CATEGORY_LABELS, getItemCategory, type CategoryId } from "@/lib/itemCategories";
import type { ShoppingList } from "@/lib/types";

type ListWithItems = ShoppingList & {
  items: { name: string; quantity: string | null; category: string | null }[];
  sharedWithHousehold: boolean;
};

export default function ListsGrid({
  lists,
  currentUserId,
}: {
  lists: ListWithItems[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  function matches(list: ListWithItems) {
    if (!trimmed) return true;
    if (list.name.toLowerCase().includes(trimmed)) return true;
    return list.items.some((item) => {
      const category = (item.category as CategoryId | null) || getItemCategory(item.name);
      return (
        item.name.toLowerCase().includes(trimmed) ||
        (item.quantity ?? "").toLowerCase().includes(trimmed) ||
        CATEGORY_LABELS[category].toLowerCase().includes(trimmed)
      );
    });
  }

  const filtered = lists.filter(matches);

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search your lists and their items..."
        className="font-hand w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
      />

      {filtered.length > 0 && (
        <ul className="w-full space-y-2">
          {filtered.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              isOwner={list.owner_id === currentUserId}
              sharedWithHousehold={list.sharedWithHousehold}
            />
          ))}
        </ul>
      )}

      {filtered.length === 0 && trimmed && (
        <p className="font-hand text-center text-gray-400 dark:text-gray-500">
          No lists or items match &ldquo;{query}&rdquo;.
        </p>
      )}
    </>
  );
}
