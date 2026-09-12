"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { expandSynonyms, termMatches } from "@/lib/ingredientSynonyms";
import type { RecipeIngredient, ShoppingList } from "@/lib/types";

export default function AddRecipeToListModal({
  recipeName,
  ingredients,
  userLists,
  pantryItemNames,
  onClose,
}: {
  recipeName: string;
  ingredients: RecipeIngredient[];
  userLists: ShoppingList[];
  pantryItemNames: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">(userLists.length > 0 ? "existing" : "new");
  const [newListName, setNewListName] = useState(recipeName);
  const [selectedListId, setSelectedListId] = useState(userLists[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An ingredient already in the household pantry starts unchecked — you
  // probably don't need to buy what you already have. Matched the same
  // way "What can I make?" matches pantry items against recipe
  // ingredients, EN/RO synonyms included.
  const pantrySynonyms = pantryItemNames.flatMap((name) => expandSynonyms(name));
  const alreadyHave = (ingredientName: string) => pantrySynonyms.some((s) => termMatches(ingredientName, s));

  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(ingredients.filter((ing) => !alreadyHave(ing.name)).map((ing) => ing.id)),
  );

  function toggleIngredient(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = ingredients.filter((ing) => checkedIds.has(ing.id));
    if (selected.length === 0) {
      setError("Pick at least one ingredient to add.");
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
    const toInsert = selected.filter((ing) => !existingNames.has(ing.name.toLowerCase()));

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
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-center text-2xl text-gray-900 dark:text-gray-100">Add ingredients to a list</h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-sm font-medium">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 ${mode === "existing" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
              onClick={() => setMode("existing")}
              disabled={userLists.length === 0}
            >
              Existing list
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 ${mode === "new" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
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
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm focus:border-[var(--accent-food)] focus:outline-none"
              >
                {userLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">You don&apos;t have any lists yet.</p>
            )
          ) : (
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm focus:border-[var(--accent-food)] focus:outline-none"
            />
          )}

          {ingredients.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                Ingredients
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                {ingredients.map((ing) => {
                  const have = alreadyHave(ing.name);
                  return (
                    <li key={ing.id}>
                      <label className="flex touch-manipulation items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(ing.id)}
                          onChange={() => toggleIngredient(ing.id)}
                          className="h-4 w-4 shrink-0 rounded border-gray-300 dark:border-gray-700"
                        />
                        <span className={`flex-1 ${have ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>
                          {ing.name}
                          {ing.quantity && <span className="text-xs"> ({ing.quantity})</span>}
                        </span>
                        {have && (
                          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">already have</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
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
            className="w-full touch-manipulation px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
