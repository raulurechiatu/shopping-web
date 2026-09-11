"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RecipeIngredient, ShoppingList } from "@/lib/types";

export default function AddRecipeToListModal({
  recipeName,
  ingredients,
  userLists,
  onClose,
}: {
  recipeName: string;
  ingredients: RecipeIngredient[];
  userLists: ShoppingList[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">(userLists.length > 0 ? "existing" : "new");
  const [newListName, setNewListName] = useState(recipeName);
  const [selectedListId, setSelectedListId] = useState(userLists[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ingredients.length === 0) {
      setError("This recipe has no ingredients yet.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let targetListId = selectedListId;

    if (mode === "new") {
      const { data: newList, error: createError } = await supabase.rpc("create_list", {
        list_name: newListName.trim() || recipeName,
      });

      if (createError || !newList) {
        setError(createError?.message ?? "Could not create the list.");
        setSaving(false);
        return;
      }

      targetListId = newList.id;
    }

    if (!targetListId) {
      setError("Pick a list to add ingredients to.");
      setSaving(false);
      return;
    }

    // Skip ingredients that are already pending on the target list, same
    // dedup rule as adding a single item by hand.
    const { data: existingItems } = await supabase
      .from("list_items")
      .select("name")
      .eq("list_id", targetListId)
      .eq("is_checked", false);

    const existingNames = new Set((existingItems ?? []).map((i) => i.name.toLowerCase()));
    const toInsert = ingredients.filter((ing) => !existingNames.has(ing.name.toLowerCase()));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("list_items").insert(
        toInsert.map((ing) => ({
          list_id: targetListId,
          name: ing.name,
          quantity: ing.quantity,
          added_by: user?.id ?? null,
        })),
      );

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    router.push(`/lists/${targetListId}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-center text-2xl text-gray-900">Add ingredients to a list</h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex gap-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 ${mode === "existing" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              onClick={() => setMode("existing")}
              disabled={userLists.length === 0}
            >
              Existing list
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 ${mode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              onClick={() => setMode("new")}
            >
              New list
            </button>
          </div>

          {mode === "existing" ? (
            userLists.length > 0 ? (
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#2b3a55] focus:outline-none"
              >
                {userLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">You don&apos;t have any lists yet.</p>
            )
          ) : (
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#2b3a55] focus:outline-none"
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add ingredients"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full touch-manipulation px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
