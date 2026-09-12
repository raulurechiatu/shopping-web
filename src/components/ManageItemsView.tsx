"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import { getItemCategory } from "@/lib/itemCategories";
import { useDialog } from "@/lib/DialogProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import type { HouseholdItem } from "@/lib/types";

export default function ManageItemsView({
  initialPantryItems,
  householdId,
  memberNames,
  currentUserId,
}: {
  initialPantryItems: HouseholdItem[];
  householdId: string | null;
  memberNames: Record<string, string>;
  currentUserId: string;
}) {
  const { confirmDialog, alertDialog } = useDialog();
  const requireOnline = useOnlineGuard();
  const [pantryItems, setPantryItems] = useState<HouseholdItem[]>(initialPantryItems);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [detailItem, setDetailItem] = useState<HouseholdItem | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`household_items:${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "household_items", filter: `household_id=eq.${householdId}` },
        (payload) => {
          setPantryItems((current) => {
            if (payload.eventType === "DELETE") {
              const removedId = (payload.old as Partial<HouseholdItem>)?.id;
              if (!removedId) return current;
              return current.filter((i) => i.id !== removedId);
            }
            const incoming = payload.new as HouseholdItem | undefined;
            if (!incoming?.id) return current;
            const withoutIncoming = current.filter((i) => i.id !== incoming.id);
            return [...withoutIncoming, incoming];
          });
          setDetailItem((current) => {
            if (!current || payload.eventType === "DELETE") return current;
            const incoming = payload.new as HouseholdItem | undefined;
            return incoming && incoming.id === current.id ? incoming : current;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  async function addPantryItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding || !householdId) return;
    if (pantryItems.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setNewName("");
      return;
    }
    if (!(await requireOnline())) return;

    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("household_items")
      .insert({ household_id: householdId, name, category: getItemCategory(name), added_by: currentUserId })
      .select()
      .single();

    if (error || !data) {
      await alertDialog(error?.message ?? "Couldn't add this item.");
    } else {
      setPantryItems((current) => [...current, data as HouseholdItem]);
      setNewName("");
    }
    setAdding(false);
  }

  async function toggleFavorite(item: HouseholdItem) {
    if (!(await requireOnline())) return;
    const nextValue = !item.is_favorite;
    setPantryItems((current) => current.map((i) => (i.id === item.id ? { ...i, is_favorite: nextValue } : i)));
    const supabase = createClient();
    const { error } = await supabase.from("household_items").update({ is_favorite: nextValue }).eq("id", item.id);
    if (error) {
      setPantryItems((current) => current.map((i) => (i.id === item.id ? item : i)));
    }
  }

  async function updatePantryQuantity(item: HouseholdItem, quantity: number) {
    if (quantity < 1 || !(await requireOnline())) return;
    setPantryItems((current) => current.map((i) => (i.id === item.id ? { ...i, quantity } : i)));
    setDetailItem((current) => (current?.id === item.id ? { ...current, quantity } : current));
    const supabase = createClient();
    const { error } = await supabase
      .from("household_items")
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      setPantryItems((current) => current.map((i) => (i.id === item.id ? item : i)));
      setDetailItem((current) => (current?.id === item.id ? item : current));
    }
  }

  async function deletePantryItem(item: HouseholdItem) {
    const ok = await confirmDialog(`Remove "${item.name}" from the pantry?`);
    if (!ok) return;
    if (!(await requireOnline())) return;

    setPantryItems((current) => current.filter((i) => i.id !== item.id));
    setDetailItem((current) => (current?.id === item.id ? null : current));
    const supabase = createClient();
    const { error } = await supabase.from("household_items").delete().eq("id", item.id);
    if (error) {
      setPantryItems((current) => [...current, item]);
      await alertDialog(error.message);
    }
  }

  const trimmedQuery = newName.trim().toLowerCase();
  const filtered = (
    trimmedQuery ? pantryItems.filter((i) => i.name.toLowerCase().includes(trimmedQuery)) : pantryItems
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col gap-5">
        <div>
          <h1 className="font-script text-3xl font-bold text-gray-900 dark:text-gray-100">Items</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Your household&apos;s shared pantry and favorites.
          </p>
        </div>

        {!householdId ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center dark:border-gray-700">
            <p className="font-hand text-base text-gray-500 dark:text-gray-400">
              Create a household to start tracking what you have at home — shared with anyone you invite.
            </p>
            <Link
              href="/account"
              className="mt-3 inline-block touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f2c42]"
            >
              Set up household
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={addPantryItem} className="flex gap-2">
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

            {pantryItems.length === 0 && (
              <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
                Nothing here yet — add what you have at home.
              </p>
            )}

            {pantryItems.length > 0 && filtered.length === 0 && (
              <p className="font-hand py-12 text-center text-lg text-gray-400 dark:text-gray-500">
                No items match &ldquo;{newName.trim()}&rdquo;.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {filtered.map((item) => (
                <ItemPill
                  key={item.id}
                  item={item}
                  addedByName={item.added_by ? memberNames[item.added_by] : undefined}
                  onOpenDetail={() => setDetailItem(item)}
                  onToggleFavorite={() => toggleFavorite(item)}
                  onDelete={() => deletePantryItem(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {detailItem && (
        <PantryItemDetail
          item={detailItem}
          addedByName={detailItem.added_by ? (memberNames[detailItem.added_by] ?? "Household member") : null}
          onChangeQuantity={(q) => updatePantryQuantity(detailItem, q)}
          onDelete={() => deletePantryItem(detailItem)}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

function ItemPill({
  item,
  addedByName,
  onOpenDetail,
  onToggleFavorite,
  onDelete,
}: {
  item: HouseholdItem;
  addedByName: string | undefined;
  onOpenDetail: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-gray-300 bg-white pl-2 dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex touch-manipulation items-center gap-1.5 py-1.5 pl-1"
      >
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2b3a55] text-[9px] font-medium text-white"
          title={addedByName}
        >
          {(addedByName ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="font-hand flex items-center gap-1 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
          <span>{getItemIcon(item.name)}</span>
          {item.name}
          {item.quantity > 1 && <span className="text-gray-400 dark:text-gray-500">×{item.quantity}</span>}
        </span>
      </button>
      <button
        onClick={onToggleFavorite}
        aria-label={item.is_favorite ? "Remove from favorites" : "Mark as favorite"}
        className={`touch-manipulation rounded-full p-1.5 text-sm ${
          item.is_favorite ? "text-amber-500" : "text-gray-300 hover:text-amber-500 dark:text-gray-600"
        }`}
      >
        {item.is_favorite ? "★" : "☆"}
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete item"
        className="touch-manipulation rounded-full p-1.5 pr-2.5 text-sm text-gray-400 hover:text-red-500 dark:text-gray-500"
      >
        ✕
      </button>
    </div>
  );
}

function PantryItemDetail({
  item,
  addedByName,
  onChangeQuantity,
  onDelete,
  onClose,
}: {
  item: HouseholdItem;
  addedByName: string | null;
  onChangeQuantity: (quantity: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-hand flex items-center gap-2 text-2xl text-gray-900 dark:text-gray-100">
            <span>{getItemIcon(item.name)}</span>
            {item.name}
          </h2>
          <button
            onClick={onClose}
            className="touch-manipulation rounded-full p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
          Quantity
        </p>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => onChangeQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
          >
            −
          </button>
          <span className="font-hand min-w-6 text-center text-lg text-gray-900 dark:text-gray-100">
            {item.quantity}
          </span>
          <button
            onClick={() => onChangeQuantity(item.quantity + 1)}
            aria-label="Increase quantity"
            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
          >
            +
          </button>
        </div>

        {addedByName && (
          <p className="mb-4 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
            Added by {addedByName}
          </p>
        )}

        <button
          onClick={onDelete}
          className="w-full touch-manipulation rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:text-gray-400"
        >
          Remove from pantry
        </button>
      </div>
    </div>
  );
}
