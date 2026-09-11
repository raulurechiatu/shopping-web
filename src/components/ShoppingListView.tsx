"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import { CATEGORY_ORDER, getItemCategory, type CategoryId } from "@/lib/itemCategories";
import { lookupBarcode } from "@/lib/barcodeLookup";
import ShareModal from "@/components/ShareModal";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useDialog } from "@/lib/DialogProvider";
import type { CatalogItem, ShoppingItem, ShoppingList } from "@/lib/types";

export default function ShoppingListView({
  list,
  initialItems,
  initialCatalog,
  isOwner,
  ownerName,
}: {
  list: ShoppingList;
  initialItems: ShoppingItem[];
  initialCatalog: CatalogItem[];
  isOwner: boolean;
  ownerName?: string | null;
}) {
  const router = useRouter();
  const { confirmDialog, alertDialog } = useDialog();
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryId | "">("");
  const [showInvite, setShowInvite] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "looking-up">("idle");
  const [isAdding, setIsAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleDeleteList() {
    const ok = await confirmDialog(
      `Delete "${list.name}"? This removes it for everyone and can't be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lists").delete().eq("id", list.id);
    if (error) {
      await alertDialog(error.message);
      setDeleting(false);
      return;
    }
    router.push("/lists");
  }

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

  async function addItemByName(rawName: string, rawQuantity?: string, rawCategory?: CategoryId | null) {
    const name = rawName.trim();
    if (!name || isAdding) return;
    // Someone's already shopping for this — don't create a second row.
    if (pendingNames.has(name.toLowerCase())) {
      setNewItem("");
      setNewQuantity("");
      setNewCategory("");
      return;
    }

    const quantity = rawQuantity?.trim() || null;
    const category = rawCategory || getItemCategory(name);

    setIsAdding(true);
    setNewItem("");
    setNewQuantity("");
    setNewCategory("");
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
      quantity,
      is_checked: false,
      added_by: user?.id ?? null,
      created_at: new Date().toISOString(),
      checked_at: null,
      category,
    };
    setItems((current) => [...current, optimisticItem]);

    const { data, error } = await supabase
      .from("list_items")
      .insert({ list_id: list.id, name, quantity, category, added_by: user?.id ?? null })
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
    await addItemByName(newItem, newQuantity, newCategory || null);
  }

  async function handleScan(code: string) {
    setShowScanner(false);
    setScanStatus("looking-up");
    const name = await lookupBarcode(code);
    setNewItem(name ?? code);
    setScanStatus("idle");
    inputRef.current?.focus();
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

  const pending = items
    .filter((i) => !i.is_checked)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const checked = items
    .filter((i) => i.is_checked)
    .sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? ""));

  const pendingByCategory = (() => {
    const groups = new Map<CategoryId, ShoppingItem[]>();
    for (const item of pending) {
      const cat = (item.category as CategoryId | null) || getItemCategory(item.name);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return CATEGORY_ORDER.filter((c) => groups.has(c.id)).map((c) => ({
      ...c,
      items: groups.get(c.id)!,
    }));
  })();

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-[#14171c] px-0 py-0 sm:px-6 sm:py-10">
      <div className="relative mx-auto min-h-screen w-full max-w-2xl bg-white dark:bg-gray-900 shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl">
        {/* Notebook margin line */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-10 w-px bg-red-300/70 sm:left-12" />

        <header className="relative border-b border-gray-200 dark:border-gray-700 px-5 pt-6 pb-4 pl-16 sm:pl-20">
          <Link
            href="/lists"
            className="mb-2 inline-flex touch-manipulation items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.56l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 111.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Your Lists
          </Link>
          <h1 className="-rotate-1 font-script text-3xl font-bold text-gray-900 dark:text-gray-100">
            <span className="mr-1">{getItemIcon(list.name)}</span>
            {list.name}
          </h1>
          {!isOwner && ownerName && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Created by {ownerName}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="flex touch-manipulation items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M15 8a3 3 0 10-2.83-4H12a3 3 0 000 6h.17A3 3 0 0015 8zM5 10a3 3 0 100 6 3 3 0 000-6zm10 2a3 3 0 100 6 3 3 0 000-6z" />
                <path d="M7.5 12.5l5-3M7.5 13.5l5 3" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Invite people · {list.invite_code}
            </button>
            {isOwner && (
              <button
                onClick={handleDeleteList}
                disabled={deleting}
                className="touch-manipulation rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-800 hover:text-red-500"
              >
                🗑️ Delete list
              </button>
            )}
          </div>
        </header>

        <main className="px-5 py-5 pl-16 sm:pl-20">
          <form onSubmit={handleSubmit} className="mb-3 flex items-end gap-2">
            <input
              ref={inputRef}
              autoFocus
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Write an item... (EN or RO)"
              className="font-hand min-w-0 flex-1 border-b-2 border-gray-300 dark:border-gray-700 bg-transparent px-1 py-2 text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[var(--accent-food)] focus:outline-none"
            />
            <input
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="qty"
              className="font-hand w-16 shrink-0 border-b-2 border-gray-300 dark:border-gray-700 bg-transparent px-1 py-2 text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[var(--accent-food)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={scanStatus === "looking-up"}
              aria-label="Scan a barcode"
              className="shrink-0 touch-manipulation rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {scanStatus === "looking-up" ? "…" : "📷"}
            </button>
            <button
              type="submit"
              disabled={isAdding || !newItem.trim()}
              className="shrink-0 touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

          {newItem.trim() &&
            (() => {
              const detected = CATEGORY_ORDER.find((c) => c.id === getItemCategory(newItem))!;
              return (
                <div className="mb-3 flex items-center gap-1.5">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryId | "")}
                    className="font-hand rounded-full border border-dashed border-gray-300 dark:border-gray-700 bg-transparent px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none"
                  >
                    <option value="">
                      Auto: {detected.icon} {detected.label}
                    </option>
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

          {suggestions.length > 0 && (
            <div className="mb-6">
              {!newItem.trim() && (
                <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
                  Quick add
                </p>
              )}
              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => addItemByName(c.name, undefined, c.category as CategoryId | null)}
                    className="font-hand flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-base text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 sm:shrink"
                  >
                    <span>{getItemIcon(c.name)}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && checked.length === 0 && (
            <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
              The list is empty. Write something above to get started.
            </p>
          )}

          <div className="space-y-4">
            {pendingByCategory.map((group) => (
              <div key={group.id}>
                {pendingByCategory.length > 1 && (
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
                    {group.icon} {group.label}
                  </p>
                )}
                <ul className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <ItemChip key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {checked.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
                Checked ({checked.length})
              </p>
              <ul className="flex flex-wrap gap-2">
                {checked.map((item) => (
                  <ItemChip key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>

      {showInvite && (
        <ShareModal
          title={`Invite to "${list.name}"`}
          description="Share a link or code so others can join your list."
          code={list.invite_code}
          joinPath={`/join/${list.invite_code}`}
          mailSubject={`Join my shopping list "${list.name}"`}
          shareText={(joinUrl) =>
            `Join my shopping list "${list.name}" so we can shop together.\n\nOpen this link to join instantly: ${joinUrl}\n\nOr enter this invite code in the app: ${list.invite_code}`
          }
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

function ItemChip({
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
      className={`flex items-center rounded-full border ${
        item.is_checked ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(item)}
        className="flex touch-manipulation items-center gap-1.5 py-1.5 pr-1 pl-2.5 text-left"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            item.is_checked ? "border-[#2b3a55] bg-[#2b3a55]" : "border-gray-400 bg-white dark:bg-gray-900"
          }`}
        >
          {item.is_checked && (
            <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
              <path
                d="M3 8.5L6.5 12L13 4.5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="shrink-0 text-base leading-none">{getItemIcon(item.name)}</span>
        <span
          className={`font-hand text-base whitespace-nowrap ${
            item.is_checked
              ? "text-gray-400 dark:text-gray-500 line-through decoration-red-500 decoration-2"
              : "text-gray-900 dark:text-gray-100"
          }`}
        >
          {item.name}
          {item.quantity && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">×{item.quantity}</span>}
        </span>
      </button>
      <button
        onClick={() => onDelete(item)}
        className="shrink-0 touch-manipulation rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500"
        aria-label="Delete item"
      >
        ✕
      </button>
    </li>
  );
}
