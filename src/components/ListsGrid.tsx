"use client";

import { useState } from "react";
import ListRow from "@/components/ListRow";
import type { ShoppingList } from "@/lib/types";

export default function ListsGrid({
  lists,
  currentUserId,
}: {
  lists: ShoppingList[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? lists.filter((l) => l.name.toLowerCase().includes(trimmed)) : lists;

  return (
    <>
      {lists.length > 4 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search your lists..."
          className="font-hand w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      )}

      {filtered.length > 0 && (
        <ul className="w-full space-y-2">
          {filtered.map((list) => (
            <ListRow key={list.id} list={list} isOwner={list.owner_id === currentUserId} />
          ))}
        </ul>
      )}

      {filtered.length === 0 && trimmed && (
        <p className="font-hand text-center text-gray-400 dark:text-gray-500">
          No lists match &ldquo;{query}&rdquo;.
        </p>
      )}
    </>
  );
}
