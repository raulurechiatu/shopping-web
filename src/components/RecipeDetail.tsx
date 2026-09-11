"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon } from "@/lib/itemIcons";
import AddRecipeToListModal from "@/components/AddRecipeToListModal";
import ShareModal from "@/components/ShareModal";
import type { Recipe, RecipeIngredient, ShoppingList } from "@/lib/types";

const ACCENT = { food: "#2b3a55", cocktail: "#6b3fa0" } as const;

export default function RecipeDetail({
  recipe,
  ingredients,
  userLists,
  isOwner,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  userLists: ShoppingList[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [showAddToList, setShowAddToList] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCocktail = recipe.kind === "cocktail";
  const accent = ACCENT[recipe.kind];
  const backHref = isCocktail ? "/recipes/cocktails" : "/recipes";
  const backLabel = isCocktail ? "Cocktails" : "Recipes";
  const noun = isCocktail ? "cocktail" : "recipe";

  const steps = (recipe.instructions ?? "")
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipe.id);
    router.push(backHref);
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-0 py-0 sm:px-6 sm:py-10">
      <div className="relative mx-auto min-h-screen w-full max-w-2xl bg-white shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl">
        <div
          className="pointer-events-none absolute top-0 bottom-0 left-10 w-px sm:left-12"
          style={{ backgroundColor: isCocktail ? "#c9a8e0" : "rgba(252,165,165,0.7)" }}
        />

        <header className="relative border-b border-gray-200 px-5 pt-6 pb-4 pl-16 sm:pl-20">
          <Link
            href={backHref}
            className="mb-2 inline-flex touch-manipulation items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.56l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 111.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            {backLabel}
          </Link>
          <h1 className="-rotate-1 font-script text-3xl font-bold text-gray-900">
            {isCocktail && <span className="mr-1">🍸</span>}
            {recipe.name}
          </h1>
          {!isOwner && <p className="mt-1 text-xs text-gray-400">Shared with you — view only</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddToList(true)}
              style={{ borderColor: accent, color: accent }}
              className="touch-manipulation rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:opacity-80"
            >
              Add ingredients to a list
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => setShowShare(true)}
                  className="touch-manipulation rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-gray-400 hover:text-gray-900"
                >
                  Share
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
              </>
            )}
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
                    <span className="font-hand shrink-0 text-lg" style={{ color: accent }}>
                      {index + 1}.
                    </span>
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

      {showShare && (
        <ShareModal
          title={`Share "${recipe.name}"`}
          description={`Share a link or code so others can view this ${noun} (read-only).`}
          code={recipe.invite_code}
          joinPath={`/recipes/join/${recipe.invite_code}`}
          mailSubject={`Check out my ${noun} "${recipe.name}"`}
          shareText={(joinUrl) =>
            `Check out my ${noun} "${recipe.name}".\n\nOpen this link to view it: ${joinUrl}\n\nOr enter this code in the app: ${recipe.invite_code}`
          }
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
