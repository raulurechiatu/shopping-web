"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import { getItemCategory } from "@/lib/itemCategories";
import { useDialog } from "@/lib/DialogProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import type { UserItem, HouseholdItem } from "@/lib/types";

export default function ManageItemsView({
  initialFavorites,
  initialPantryItems,
  householdId,
  memberNames,
  currentUserId,
}: {
  initialFavorites: UserItem[];
  initialPantryItems: HouseholdItem[];
  householdId: string | null;
  memberNames: Record<string, string>;
  currentUserId: string;
}) {
  const { confirmDialog, alertDialog } = useDialog();
  const requireOnline = useOnlineGuard();
  const [favorites, setFavorites] = useState<UserItem[]>(initialFavorites);
  const [pantryItems, setPantryItems] = useState<HouseholdItem[]>(initialPantryItems);
  const [newFavoriteName, setNewFavoriteName] = useState("");
  const [newPantryName, setNewPantryName] = useState("");
  const [adding, setAdding] = useState(false);
  const [detailItem, setDetailItem] = useState<HouseholdItem | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let favoritesChannel: ReturnType<typeof supabase.channel> | undefined;
    let pantryChannel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return;

      favoritesChannel = supabase
        .channel(`user_items:${session.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_items", filter: `owner_id=eq.${session.user.id}` },
          (payload) => {
            setFavorites((current) => {
              if (payload.eventType === "DELETE") {
                const removedId = (payload.old as Partial<UserItem>)?.id;
                if (!removedId) return current;
                return current.filter((i) => i.id !== removedId);
              }
              const incoming = payload.new as UserItem | undefined;
              if (!incoming?.id) return current;
              const withoutIncoming = current.filter((i) => i.id !== incoming.id);
              if (!incoming.is_favorite) return withoutIncoming;
              return [...withoutIncoming, incoming];
            });
          },
        )
        .subscribe();

      if (householdId) {
        pantryChannel = supabase
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
      }
    });

    return () => {
      cancelled = true;
      if (favoritesChannel) supabase.removeChannel(favoritesChannel);
      if (pantryChannel) supabase.removeChannel(pantryChannel);
    };
  }, [householdId]);

  async function addFavorite(e: React.FormEvent) {
    e.preventDefault();
    const name = newFavoriteName.trim();
    if (!name || adding) return;
    if (favorites.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setNewFavoriteName("");
      return;
    }
    if (!(await requireOnline())) return;

    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_items")
      .insert({ name, category: getItemCategory(name), owner_id: currentUserId, is_favorite: true })
      .select()
      .single();

    if (error || !data) {
      await alertDialog(error?.message ?? "Couldn't add this item.");
    } else {
      setFavorites((current) => [...current, data as UserItem]);
      setNewFavoriteName("");
    }
    setAdding(false);
  }

  async function deleteFavorite(item: UserItem) {
    const ok = await confirmDialog(`Remove "${item.name}" from your favorites?`);
    if (!ok) return;
    if (!(await requireOnline())) return;

    setFavorites((current) => current.filter((i) => i.id !== item.id));
    const supabase = createClient();
    const { error } = await supabase.from("user_items").delete().eq("id", item.id);
    if (error) {
      setFavorites((current) => [...current, item]);
      await alertDialog(error.message);
    }
  }

  async function addPantryItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newPantryName.trim();
    if (!name || adding || !householdId) return;
    if (pantryItems.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setNewPantryName("");
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
      setNewPantryName("");
    }
    setAdding(false);
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

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col gap-6">
        <div>
          <h1 className="font-script text-3xl font-bold text-gray-900 dark:text-gray-100">Items</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Your favorites, and your household&apos;s shared pantry.
          </p>
        </div>

        <section>
          <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            ⭐ Favorites
          </p>
          <form onSubmit={addFavorite} className="mb-3 flex gap-2">
            <input
              value={newFavoriteName}
              onChange={(e) => setNewFavoriteName(e.target.value)}
              placeholder="Add a favorite... (EN or RO)"
              className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={adding || !newFavoriteName.trim()}
              className="shrink-0 touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {(() => {
            const q = newFavoriteName.trim().toLowerCase();
            const filtered = (q ? favorites.filter((i) => i.name.toLowerCase().includes(q)) : favorites).sort(
              (a, b) => a.name.localeCompare(b.name),
            );
            if (favorites.length === 0) {
              return (
                <p className="font-hand py-6 text-center text-base text-gray-400 dark:text-gray-500">
                  No favorites yet — add your usual buys above.
                </p>
              );
            }
            if (filtered.length === 0) {
              return (
                <p className="font-hand py-6 text-center text-base text-gray-400 dark:text-gray-500">
                  No favorites match &ldquo;{newFavoriteName.trim()}&rdquo;.
                </p>
              );
            }
            return (
              <div className="flex flex-wrap gap-2">
                {filtered.map((item) => (
                  <span
                    key={item.id}
                    className="flex items-center gap-0.5 rounded-full border border-gray-300 bg-white pl-3 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <span className="font-hand flex items-center gap-1 py-1.5 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                      <span>{getItemIcon(item.name)}</span>
                      {item.name}
                    </span>
                    <button
                      onClick={() => deleteFavorite(item)}
                      aria-label="Remove favorite"
                      className="touch-manipulation rounded-full p-1.5 pr-2.5 text-sm text-gray-400 hover:text-red-500 dark:text-gray-500"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            );
          })()}
        </section>

        <section className="border-t border-gray-100 pt-6 dark:border-gray-800">
          <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            🏠 Pantry
          </p>

          {!householdId ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center dark:border-gray-700">
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
              <form onSubmit={addPantryItem} className="mb-3 flex gap-2">
                <input
                  value={newPantryName}
                  onChange={(e) => setNewPantryName(e.target.value)}
                  placeholder="Add to pantry... (EN or RO)"
                  className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={adding || !newPantryName.trim()}
                  className="shrink-0 touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-40"
                >
                  Add
                </button>
              </form>

              {(() => {
                const q = newPantryName.trim().toLowerCase();
                const filtered = (
                  q ? pantryItems.filter((i) => i.name.toLowerCase().includes(q)) : pantryItems
                ).sort((a, b) => a.name.localeCompare(b.name));
                if (pantryItems.length === 0) {
                  return (
                    <p className="font-hand py-6 text-center text-base text-gray-400 dark:text-gray-500">
                      Nothing in the pantry yet — add what you have at home.
                    </p>
                  );
                }
                if (filtered.length === 0) {
                  return (
                    <p className="font-hand py-6 text-center text-base text-gray-400 dark:text-gray-500">
                      No pantry items match &ldquo;{newPantryName.trim()}&rdquo;.
                    </p>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDetailItem(item)}
                        className="flex touch-manipulation items-center gap-1.5 rounded-full border border-gray-300 bg-white py-1.5 pr-3 pl-2.5 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2b3a55] text-[9px] font-medium text-white"
                          title={item.added_by ? memberNames[item.added_by] : undefined}
                        >
                          {(item.added_by ? memberNames[item.added_by] : "?")?.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-hand text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                          {getItemIcon(item.name)} {item.name}
                          {item.quantity > 1 && (
                            <span className="ml-1 text-gray-400 dark:text-gray-500">×{item.quantity}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </section>
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
