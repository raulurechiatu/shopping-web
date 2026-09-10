"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShoppingItem, ShoppingList } from "@/lib/types";

export default function ShoppingListView({
  list,
  initialItems,
}: {
  list: ShoppingList;
  initialItems: ShoppingItem[];
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`list_items:${list.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `list_id=eq.${list.id}` },
        (payload) => {
          setItems((current) => {
            if (payload.eventType === "INSERT") {
              const incoming = payload.new as ShoppingItem;
              if (current.some((i) => i.id === incoming.id)) return current;
              return [...current, incoming];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as ShoppingItem;
              return current.map((i) => (i.id === updated.id ? updated : i));
            }
            if (payload.eventType === "DELETE") {
              const removed = payload.old as ShoppingItem;
              return current.filter((i) => i.id !== removed.id);
            }
            return current;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [list.id]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setNewItem("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("list_items")
      .insert({ list_id: list.id, name, added_by: user?.id ?? null });
  }

  async function toggleItem(item: ShoppingItem) {
    const supabase = createClient();
    await supabase
      .from("list_items")
      .update({
        is_checked: !item.is_checked,
        checked_at: !item.is_checked ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("list_items").delete().eq("id", id);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const pending = items
    .filter((i) => !i.is_checked)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const checked = items
    .filter((i) => i.is_checked)
    .sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? ""));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{list.name}</h1>
            <button
              onClick={() => setShowCode((s) => !s)}
              className="text-xs text-gray-500 underline"
            >
              {showCode ? `Invite code: ${list.invite_code}` : "Show invite code"}
            </button>
          </div>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <form onSubmit={addItem} className="mb-6 flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add
          </button>
        </form>

        {pending.length === 0 && checked.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            No items yet. Add something to get started.
          </p>
        )}

        <ul className="space-y-2">
          {pending.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
          ))}
        </ul>

        {checked.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Checked ({checked.length})
            </p>
            <ul className="space-y-2">
              {checked.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
      <input
        type="checkbox"
        checked={item.is_checked}
        onChange={() => onToggle(item)}
        className="h-5 w-5 shrink-0 rounded border-gray-300"
      />
      <span
        className={`flex-1 text-sm ${item.is_checked ? "text-gray-400 line-through" : "text-gray-900"}`}
      >
        {item.name}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-300 hover:text-red-500"
        aria-label="Delete item"
      >
        ✕
      </button>
    </li>
  );
}
