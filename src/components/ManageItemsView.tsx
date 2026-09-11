"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import { getItemCategory } from "@/lib/itemCategories";
import { useDialog } from "@/lib/DialogProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import type { UserItem } from "@/lib/types";

export default function ManageItemsView({ initialItems }: { initialItems: UserItem[] }) {
  const { confirmDialog, alertDialog } = useDialog();
  const requireOnline = useOnlineGuard();
  const [items, setItems] = useState<UserItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return;
      channel = supabase
        .channel(`user_items:${session.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_items", filter: `owner_id=eq.${session.user.id}` },
          (payload) => {
            setItems((current) => {
              if (payload.eventType === "DELETE") {
                const removedId = (payload.old as Partial<UserItem>)?.id;
                if (!removedId) return current;
                return current.filter((i) => i.id !== removedId);
              }
              const incoming = payload.new as UserItem | undefined;
              if (!incoming?.id) return current;
              const withoutIncoming = current.filter((i) => i.id !== incoming.id);
              return [...withoutIncoming, incoming];
            });
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding) return;
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setNewName("");
      return;
    }
    if (!(await requireOnline())) return;

    setAdding(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("user_items")
      .insert({ name, category: getItemCategory(name), owner_id: user?.id })
      .select()
      .single();

    if (error || !data) {
      await alertDialog(error?.message ?? "Couldn't add this item.");
    } else {
      setItems((current) => [...current, data as UserItem]);
      setNewName("");
    }
    setAdding(false);
  }

  async function toggle(item: UserItem, field: "is_favorite" | "is_pantry") {
    if (!(await requireOnline())) return;
    const nextValue = !item[field];
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, [field]: nextValue } : i)));
    const supabase = createClient();
    const { error } = await supabase
      .from("user_items")
      .update({ [field]: nextValue })
      .eq("id", item.id);
    if (error) {
      setItems((current) => current.map((i) => (i.id === item.id ? item : i)));
    }
  }

  async function deleteItem(item: UserItem) {
    const ok = await confirmDialog(`Remove "${item.name}" from your items?`);
    if (!ok) return;
    if (!(await requireOnline())) return;

    setItems((current) => current.filter((i) => i.id !== item.id));
    const supabase = createClient();
    const { error } = await supabase.from("user_items").delete().eq("id", item.id);
    if (error) {
      setItems((current) => [...current, item]);
      await alertDialog(error.message);
    }
  }

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = (trimmedQuery ? items.filter((i) => i.name.toLowerCase().includes(trimmedQuery)) : items).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col gap-5">
        <div>
          <h1 className="font-script text-3xl font-bold text-gray-900 dark:text-gray-100">Items</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Your favorites and what you have at home — independent of any one list.
          </p>
        </div>

        <form onSubmit={addItem} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add an item... (EN or RO)"
            className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="shrink-0 touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-40"
          >
            Add
          </button>
        </form>

        {items.length > 4 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search items..."
            className="font-hand w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        )}

        {items.length === 0 && (
          <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
            No items yet — add one above, or star an item while shopping.
          </p>
        )}

        {items.length > 0 && filtered.length === 0 && (
          <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
            No items match &ldquo;{query}&rdquo;.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {filtered.map((item) => (
            <ItemPill key={item.id} item={item} onToggle={toggle} onDelete={deleteItem} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemPill({
  item,
  onToggle,
  onDelete,
}: {
  item: UserItem;
  onToggle: (item: UserItem, field: "is_favorite" | "is_pantry") => void;
  onDelete: (item: UserItem) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-gray-300 bg-white pl-3 dark:border-gray-700 dark:bg-gray-900">
      <span className="font-hand flex items-center gap-1 py-1.5 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
        <span>{getItemIcon(item.name)}</span>
        {item.name}
      </span>
      <button
        onClick={() => onToggle(item, "is_pantry")}
        aria-label={item.is_pantry ? "Remove from have at home" : "Mark as have at home"}
        className={`touch-manipulation rounded-full p-1.5 text-sm ${
          item.is_pantry
            ? "bg-green-100 dark:bg-green-950"
            : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
        }`}
      >
        🏠
      </button>
      <button
        onClick={() => onToggle(item, "is_favorite")}
        aria-label={item.is_favorite ? "Remove from favorites" : "Mark as favorite"}
        className={`touch-manipulation rounded-full p-1.5 text-sm ${
          item.is_favorite ? "text-amber-500" : "text-gray-300 hover:text-amber-500 dark:text-gray-600"
        }`}
      >
        {item.is_favorite ? "★" : "☆"}
      </button>
      <button
        onClick={() => onDelete(item)}
        aria-label="Delete item"
        className="touch-manipulation rounded-full p-1.5 pr-2.5 text-sm text-gray-400 hover:text-red-500 dark:text-gray-500"
      >
        ✕
      </button>
    </div>
  );
}
