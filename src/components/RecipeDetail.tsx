"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import AddRecipeToListModal from "@/components/AddRecipeToListModal";
import type { Recipe, RecipeIngredient, ShoppingList } from "@/lib/types";

export default function RecipeDetail({
  recipe,
  ingredients,
  userLists,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  userLists: ShoppingList[];
}) {
  const router = useRouter();
  const [showAddToList, setShowAddToList] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const steps = (recipe.instructions ?? "")
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipe.id);
    router.push("/recipes");
  }

  return (
    <div className="min-h-screen bg-[#ece7dc] px-0 py-0 sm:px-6 sm:py-10">
      <div className="relative mx-auto min-h-screen w-full max-w-2xl bg-[#fffdf6] shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl">
        <div className="pointer-events-none absolute top-0 bottom-0 left-10 w-px bg-red-300/70 sm:left-12" />

        <header className="relative border-b border-gray-200 px-5 pt-6 pb-4 pl-16 sm:pl-20">
          <h1 className="-rotate-1 font-script text-3xl font-bold text-gray-900">{recipe.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddToList(true)}
              className="touch-manipulation rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-gray-400 hover:text-gray-900"
            >
              Add ingredients to a list
            </button>
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="touch-manipulation rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-gray-400 hover:text-gray-900"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="touch-manipulation rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-400 shadow-sm hover:border-red-300 hover:text-red-500"
            >
              Delete
            </button>
          </div>
        </header>

        <main className="px-5 py-5 pl-16 sm:pl-20">
          <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
            Ingredients
          </p>
          {ingredients.length === 0 ? (
            <p className="font-hand text-lg text-gray-400">No ingredients yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {ingredients.map((ing) => (
                <li
                  key={ing.id}
                  className="font-hand flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900"
                >
                  <span>{getItemIcon(ing.name)}</span>
                  {ing.name}
                  {ing.quantity && <span className="text-xs text-gray-400">×{ing.quantity}</span>}
                </li>
              ))}
            </ul>
          )}

          {steps.length > 0 && (
            <div className="mt-8">
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                Instructions
              </p>
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="font-hand shrink-0 text-lg text-gray-400">{index + 1}.</span>
                    <span className="font-hand text-lg text-gray-900">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </main>
      </div>

      {showAddToList && (
        <AddRecipeToListModal
          recipeName={recipe.name}
          ingredients={ingredients}
          userLists={userLists}
          onClose={() => setShowAddToList(false)}
        />
      )}
    </div>
  );
}
