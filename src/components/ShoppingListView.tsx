"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import { CATEGORY_ORDER, getItemCategory, type CategoryId } from "@/lib/itemCategories";
import { lookupBarcode } from "@/lib/barcodeLookup";
import { mergeQuantities } from "@/lib/quantityScale";
import ShareModal from "@/components/ShareModal";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useToast } from "@/lib/ToastProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import type { ShoppingItem, ShoppingList, UserItem } from "@/lib/types";

export default function ShoppingListView({
  list,
  initialItems,
  initialFavorites,
  isOwner,
  ownerName,
}: {
  list: ShoppingList;
  initialItems: ShoppingItem[];
  initialFavorites: UserItem[];
  isOwner: boolean;
  ownerName?: string | null;
}) {
  const { showToast } = useToast();
  const requireOnline = useOnlineGuard();
  const currentUserIdRef = useRef<string | null>(null);
  const memberNamesRef = useRef<Map<string, string>>(new Map());
  const selfDeletedIdsRef = useRef<Set<string>>(new Set());
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryId | "">("");
  const [showInvite, setShowInvite] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "looking-up">("idle");
  const [viewerNames, setViewerNames] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<UserItem[]>(initialFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [showCategoryLabels, setShowCategoryLabels] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let itemsChannel: ReturnType<typeof supabase.channel> | undefined;
    let favoritesChannel: ReturnType<typeof supabase.channel> | undefined;
    let presenceChannel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    // Who's on this list, so toasts can name whoever added something
    // instead of staying generic.
    supabase
      .from("list_members")
      .select("user_id")
      .eq("list_id", list.id)
      .then(({ data: members }) => {
        const ids = (members ?? []).map((m) => m.user_id);
        if (cancelled || ids.length === 0) return;
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids)
          .then(({ data: profiles }) => {
            if (cancelled) return;
            for (const p of profiles ?? []) {
              if (p.full_name) memberNamesRef.current.set(p.id, p.full_name);
            }
          });
      });

    // The realtime client only authenticates once the session has been
    // loaded from cookies. Subscribing before that leaves the socket
    // anonymous, and RLS then hides every row. Wait for the session first.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      currentUserIdRef.current = session?.user?.id ?? null;

      itemsChannel = supabase
        .channel(`list_items:${list.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "list_items", filter: `list_id=eq.${list.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const incoming = payload.new as ShoppingItem;
              if (incoming.added_by && incoming.added_by !== currentUserIdRef.current) {
                const name = memberNamesRef.current.get(incoming.added_by) ?? "Someone";
                showToast(`${name} added ${incoming.name}`, "🧺");
              }
            }
            if (payload.eventType === "DELETE") {
              // payload.old is sometimes reduced to just the primary key
              // regardless of replica identity (Realtime-side behavior we
              // don't control), so look the name up in what we already have
              // loaded (via a ref — this runs outside any state updater, so
              // it must not read `items` directly) rather than the payload.
              const removedId = (payload.old as { id: string }).id;
              if (selfDeletedIdsRef.current.has(removedId)) {
                selfDeletedIdsRef.current.delete(removedId);
              } else {
                const removedItem = itemsRef.current.find((i) => i.id === removedId);
                showToast(`${removedItem?.name ?? "An item"} was removed`, "🗑️");
              }
            }
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
                const removedId = (payload.old as { id: string }).id;
                return current.filter((i) => i.id !== removedId);
              }
              return current;
            });
          },
        )
        .subscribe();

      // Keeps the favorites sheet in sync with changes made on the Items
      // screen (or from the sheet in another tab) — guests don't have a
      // personal item registry, so skip subscribing for them.
      if (!session?.user?.is_anonymous) {
        favoritesChannel = supabase
          .channel(`user_items_favorites:${session?.user?.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "user_items", filter: `owner_id=eq.${session?.user?.id}` },
            (payload) => {
              setFavorites((current) => {
                if (payload.eventType === "DELETE") {
                  const removedId = (payload.old as Partial<UserItem>)?.id;
                  if (!removedId) return current;
                  return current.filter((c) => c.id !== removedId);
                }
                const incoming = payload.new as UserItem | undefined;
                if (!incoming?.id) return current;
                const withoutIncoming = current.filter((c) => c.id !== incoming.id);
                if (!incoming.is_favorite) return withoutIncoming;
                return [...withoutIncoming, incoming].sort((a, b) => a.name.localeCompare(b.name));
              });
            },
          )
          .subscribe();
      }

      // Who else currently has this list open — a lightweight "you're not
      // alone here" signal, no DB table involved (Realtime Presence is
      // purely in-memory, tied to the socket connection).
      const myId = session?.user?.id ?? null;
      const metadata = session?.user?.user_metadata ?? {};
      const myName = session?.user?.is_anonymous
        ? "A guest"
        : (metadata.full_name as string) ||
          (metadata.name as string) ||
          session?.user?.email?.split("@")[0] ||
          "Someone";

      presenceChannel = supabase.channel(`list_presence:${list.id}`, {
        config: { presence: { key: myId ?? undefined } },
      });
      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel!.presenceState() as Record<
            string,
            { user_id: string; name: string }[]
          >;
          const names = Object.values(state)
            .flat()
            .filter((p) => p.user_id !== myId)
            .map((p) => p.name);
          setViewerNames(names);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel!.track({ user_id: myId, name: myName });
          }
        });
    });

    return () => {
      cancelled = true;
      if (itemsChannel) supabase.removeChannel(itemsChannel);
      if (favoritesChannel) supabase.removeChannel(favoritesChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [list.id]);

  async function addItemByName(rawName: string, rawQuantity?: string, rawCategory?: CategoryId | null) {
    const name = rawName.trim();
    if (!name || isAdding) return;

    // Someone's already shopping for this — merge into that row instead of
    // creating a second one for the same item.
    const existingPending = itemsRef.current.find(
      (i) => !i.is_checked && i.name.toLowerCase() === name.toLowerCase(),
    );
    if (existingPending) {
      setNewItem("");
      setNewQuantity("");
      setNewCategory("");
      const incomingQuantity = rawQuantity?.trim() || null;
      const mergedQuantity = mergeQuantities(existingPending.quantity, incomingQuantity);
      if (!incomingQuantity || mergedQuantity === existingPending.quantity) return;
      if (!(await requireOnline())) return;

      setItems((current) =>
        current.map((i) => (i.id === existingPending.id ? { ...i, quantity: mergedQuantity } : i)),
      );
      const supabase = createClient();
      const { error } = await supabase
        .from("list_items")
        .update({ quantity: mergedQuantity })
        .eq("id", existingPending.id);
      if (error) {
        setItems((current) =>
          current.map((i) => (i.id === existingPending.id ? existingPending : i)),
        );
      }
      return;
    }

    if (!(await requireOnline())) return;

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
    if (!(await requireOnline())) return;
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
    if (!(await requireOnline())) return;
    selfDeletedIdsRef.current.add(item.id);
    setItems((current) => current.filter((i) => i.id !== item.id));

    const supabase = createClient();
    const { error } = await supabase.from("list_items").delete().eq("id", item.id);

    if (error) {
      selfDeletedIdsRef.current.delete(item.id);
      setItems((current) => (current.some((i) => i.id === item.id) ? current : [...current, item]));
    }
  }

  function itemCategoryOf(item: ShoppingItem): CategoryId {
    return (item.category as CategoryId | null) || getItemCategory(item.name);
  }

  // Typing an item name doubles as a live filter over what's already on
  // the list — no separate search box needed. An exact match gets called
  // out below the input, since adding it will merge into that row instead
  // of creating a new one (see addItemByName).
  const trimmedNewItem = newItem.trim().toLowerCase();
  function matchesItemQuery(item: ShoppingItem) {
    if (!trimmedNewItem) return true;
    return item.name.toLowerCase().includes(trimmedNewItem);
  }

  const existingPendingMatch = trimmedNewItem
    ? items.find((i) => !i.is_checked && i.name.toLowerCase() === trimmedNewItem)
    : undefined;

  const pending = items
    .filter((i) => !i.is_checked && matchesItemQuery(i))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const checked = items
    .filter((i) => i.is_checked && matchesItemQuery(i))
    .sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? ""));

  const pendingByCategory = (() => {
    const groups = new Map<CategoryId, ShoppingItem[]>();
    for (const item of pending) {
      const cat = itemCategoryOf(item);
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
          {viewerNames.length > 0 && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              👀{" "}
              {viewerNames.length === 1
                ? `${viewerNames[0]} is here too`
                : `${viewerNames.length} others are here too`}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={() => setShowFavorites((v) => !v)}
                className={`flex touch-manipulation items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  showFavorites
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300"
                    : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                ⭐ Favorites ({favorites.length})
              </button>
            )}
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
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={scanStatus === "looking-up"}
              className="flex touch-manipulation items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
            >
              {scanStatus === "looking-up" ? "…" : "📷"} Scan barcode
            </button>
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
              type="submit"
              disabled={isAdding || !newItem.trim()}
              className="shrink-0 touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

          {showFavorites && favorites.length > 0 && (
            <FavoritesRow
              favorites={favorites}
              pendingNames={new Set(pending.map((i) => i.name.toLowerCase()))}
              onAdd={(fav) => addItemByName(fav.name, undefined, fav.category as CategoryId | null)}
            />
          )}

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

          {existingPendingMatch && (
            <p className="font-hand mb-4 -mt-1 text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Already on your list{existingPendingMatch.quantity ? ` (×${existingPendingMatch.quantity})` : ""}
              {newQuantity.trim() ? " — adding will update the quantity." : "."}
            </p>
          )}

          {items.length === 0 && (
            <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
              The list is empty. Write something above to get started.
            </p>
          )}

          {items.length > 0 && pending.length === 0 && !trimmedNewItem && (
            <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
              🎉 Nothing left to buy.
            </p>
          )}

          {pending.length > 0 && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                🛒 {pending.length} item{pending.length === 1 ? "" : "s"} to buy
              </p>
              {pendingByCategory.length > 1 && (
                <button
                  onClick={() => setShowCategoryLabels((v) => !v)}
                  className="touch-manipulation text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showCategoryLabels ? "Hide categories" : "🏷️ Show categories"}
                </button>
              )}
            </div>
          )}

          {showCategoryLabels ? (
            <div className="space-y-4">
              {pendingByCategory.map((group) => (
                <div key={group.id}>
                  {pendingByCategory.length > 1 && (
                    <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
                      {group.icon} {group.label}
                    </p>
                  )}
                  <ul className="flex flex-wrap gap-2.5">
                    {group.items.map((item) => (
                      <ItemChip
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onDelete={deleteItem}
                        isMatch={item.id === existingPendingMatch?.id}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2.5">
              {pendingByCategory.flatMap((group) => group.items).map((item) => (
                <ItemChip
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                  isMatch={item.id === existingPendingMatch?.id}
                />
              ))}
            </ul>
          )}

          {checked.length > 0 && (
            <div className="mt-8 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                onClick={() => setShowBought((v) => !v)}
                className="flex touch-manipulation items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <span className={`inline-block transition-transform ${showBought ? "rotate-90" : ""}`}>▸</span>
                Bought ({checked.length})
              </button>
              {showBought && (
                <ul className="mt-2.5 flex flex-wrap gap-1.5 opacity-60">
                  {checked.map((item) => (
                    <ItemChip key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} small />
                  ))}
                </ul>
              )}
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
          onShareWithHousehold={async () => {
            const supabase = createClient();
            const { error } = await supabase.rpc("share_list_with_household", { target_list_id: list.id });
            if (error) throw error;
          }}
        />
      )}
    </div>
  );
}

function ItemChip({
  item,
  onToggle,
  onDelete,
  isMatch,
  small,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  isMatch?: boolean;
  small?: boolean;
}) {
  return (
    <li
      className={`flex items-center rounded-full border ${
        isMatch
          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300 dark:border-amber-500 dark:bg-amber-950 dark:ring-amber-700"
          : item.is_checked
            ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
            : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(item)}
        className={`flex touch-manipulation items-center gap-1.5 text-left ${
          small ? "py-1 pr-1 pl-2" : "py-2 pr-1 pl-3"
        }`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            small ? "h-3.5 w-3.5" : "h-5 w-5"
          } ${item.is_checked ? "border-[#2b3a55] bg-[#2b3a55]" : "border-gray-400 bg-white dark:bg-gray-900"}`}
        >
          {item.is_checked && (
            <svg viewBox="0 0 16 16" fill="none" className={small ? "h-2 w-2" : "h-3 w-3"}>
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
        <span className={`shrink-0 leading-none ${small ? "text-sm" : "text-xl"}`}>{getItemIcon(item.name)}</span>
        <span
          className={`font-hand whitespace-nowrap ${small ? "text-sm" : "text-lg"} ${
            item.is_checked
              ? "text-gray-400 dark:text-gray-500 line-through decoration-red-500 decoration-2"
              : "text-gray-900 dark:text-gray-100"
          }`}
        >
          {item.name}
          {item.quantity && (
            <span className={`ml-1 text-gray-400 dark:text-gray-500 ${small ? "text-[10px]" : "text-xs"}`}>
              ×{item.quantity}
            </span>
          )}
        </span>
      </button>
      <button
        onClick={() => onDelete(item)}
        className={`shrink-0 touch-manipulation rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 ${
          small ? "p-1 text-xs" : "p-2"
        }`}
        aria-label="Delete item"
      >
        ✕
      </button>
    </li>
  );
}

function FavoritesRow({
  favorites,
  pendingNames,
  onAdd,
}: {
  favorites: UserItem[];
  pendingNames: Set<string>;
  onAdd: (favorite: UserItem) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
        ⭐ Favorites
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {favorites.map((fav) => {
          const onList = pendingNames.has(fav.name.toLowerCase());
          return (
            <li key={fav.id}>
              <button
                onClick={() => onAdd(fav)}
                disabled={onList}
                className={`flex touch-manipulation items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  onList
                    ? "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                    : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
                }`}
              >
                <span>{getItemIcon(fav.name)}</span>
                <span className="font-hand">{fav.name}</span>
                <span className="text-xs">{onList ? "✓" : "+"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
