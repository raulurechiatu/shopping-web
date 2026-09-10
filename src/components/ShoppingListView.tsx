"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import type { CatalogItem, ShoppingItem, ShoppingList } from "@/lib/types";

export default function ShoppingListView({
  list,
  initialItems,
  initialCatalog,
}: {
  list: ShoppingList;
  initialItems: ShoppingItem[];
  initialCatalog: CatalogItem[];
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);
  const [newItem, setNewItem] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let itemsChannel: ReturnType<typeof supabase.channel> | undefined;
    let catalogChannel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    // The realtime client only authenticates once the session has been
    // loaded from cookies. Subscribing before that leaves the socket
    // anonymous, and RLS then hides every row. Wait for the session first.
    supabase.auth.getSession().then(() => {
      if (cancelled) return;

      itemsChannel = supabase
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

      catalogChannel = supabase
        .channel(`list_item_catalog:${list.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "list_item_catalog",
            filter: `list_id=eq.${list.id}`,
          },
          (payload) => {
            setCatalog((current) => {
              if (payload.eventType === "DELETE") {
                const removed = payload.old as CatalogItem;
                return current.filter((c) => c.id !== removed.id);
              }
              const incoming = payload.new as CatalogItem;
              const withoutIncoming = current.filter((c) => c.id !== incoming.id);
              return [...withoutIncoming, incoming];
            });
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (itemsChannel) supabase.removeChannel(itemsChannel);
      if (catalogChannel) supabase.removeChannel(catalogChannel);
    };
  }, [list.id]);

  const pendingNames = useMemo(
    () => new Set(items.filter((i) => !i.is_checked).map((i) => i.name.toLowerCase())),
    [items],
  );

  const suggestions = useMemo(() => {
    const query = newItem.trim().toLowerCase();
    return [...catalog]
      .filter((c) => !pendingNames.has(c.name.toLowerCase()))
      .filter((c) => (query ? c.name.toLowerCase().includes(query) : true))
      .sort((a, b) => b.use_count - a.use_count || b.last_used_at.localeCompare(a.last_used_at))
      .slice(0, query ? 6 : 12);
  }, [catalog, pendingNames, newItem]);

  async function addItemByName(rawName: string) {
    const name = rawName.trim();
    if (!name || isAdding) return;
    // Someone's already shopping for this — don't create a second row.
    if (pendingNames.has(name.toLowerCase())) {
      setNewItem("");
      return;
    }

    setIsAdding(true);
    setNewItem("");
    inputRef.current?.focus();

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticItem: ShoppingItem = {
      id: tempId,
      list_id: list.id,
      name,
      quantity: null,
      is_checked: false,
      added_by: user?.id ?? null,
      created_at: new Date().toISOString(),
      checked_at: null,
    };
    setItems((current) => [...current, optimisticItem]);

    const { data, error } = await supabase
      .from("list_items")
      .insert({ list_id: list.id, name, added_by: user?.id ?? null })
      .select()
      .single();

    setItems((current) => {
      const withoutTemp = current.filter((i) => i.id !== tempId);
      if (error || !data) return withoutTemp;
      if (withoutTemp.some((i) => i.id === data.id)) return withoutTemp;
      return [...withoutTemp, data as ShoppingItem];
    });

    if (!error) {
      setCatalog((current) => {
        const existing = current.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          return current.map((c) =>
            c.id === existing.id
              ? { ...c, use_count: c.use_count + 1, last_used_at: new Date().toISOString() }
              : c,
          );
        }
        return current;
      });
    }

    setIsAdding(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addItemByName(newItem);
  }

  async function toggleItem(item: ShoppingItem) {
    const nextChecked = !item.is_checked;
    setItems((current) =>
      current.map((i) =>
        i.id === item.id
          ? { ...i, is_checked: nextChecked, checked_at: nextChecked ? new Date().toISOString() : null }
          : i,
      ),
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("list_items")
      .update({
        is_checked: nextChecked,
        checked_at: nextChecked ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    if (error) {
      // Roll back on failure.
      setItems((current) => current.map((i) => (i.id === item.id ? item : i)));
    }
  }

  async function deleteItem(item: ShoppingItem) {
    setItems((current) => current.filter((i) => i.id !== item.id));

    const supabase = createClient();
    const { error } = await supabase.from("list_items").delete().eq("id", item.id);

    if (error) {
      setItems((current) => (current.some((i) => i.id === item.id) ? current : [...current, item]));
    }
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
        <div className="mx-auto flex max-w-lg items-center justify-between sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
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

      <main className="mx-auto max-w-lg px-4 py-6 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item... (EN or RO)"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isAdding || !newItem.trim()}
            className="shrink-0 touch-manipulation rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            Add
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mb-6">
            {!newItem.trim() && (
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Quick add
              </p>
            )}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addItemByName(c.name)}
                  className="flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 sm:shrink"
                >
                  <span>{getItemIcon(c.name)}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && checked.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            No items yet. Add something to get started.
          </p>
        )}

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
          ))}
        </ul>

        {checked.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Checked ({checked.length})
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
  onDelete: (item: ShoppingItem) => void;
}) {
  return (
    <li
      className={`flex items-center gap-1 rounded-xl pr-2 transition-colors ${
        item.is_checked ? "bg-gray-100" : "bg-white shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(item)}
        className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl px-4 py-3 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            item.is_checked
              ? "border-emerald-600 bg-emerald-600"
              : "border-gray-300 bg-white"
          }`}
        >
          {item.is_checked && (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M3 8.5L6.5 12L13 4.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="shrink-0 text-lg leading-none">{getItemIcon(item.name)}</span>
        <span
          className={`flex-1 truncate text-sm ${
            item.is_checked ? "text-gray-400 line-through" : "font-medium text-gray-900"
          }`}
        >
          {item.name}
        </span>
      </button>
      <button
        onClick={() => onDelete(item)}
        className="shrink-0 touch-manipulation rounded-full p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
        aria-label="Delete item"
      >
        ✕
      </button>
    </li>
  );
}
