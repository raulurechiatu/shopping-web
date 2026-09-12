"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getItemIcon, getTitleIcon } from "@/lib/itemIcons";
import { scaleQuantity } from "@/lib/quantityScale";
import { convertQuantity, type UnitSystem } from "@/lib/unitConversion";
import AddRecipeToListModal from "@/components/AddRecipeToListModal";
import ShareModal from "@/components/ShareModal";
import { useDialog } from "@/lib/DialogProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import type { Recipe, RecipeIngredient, ShoppingList } from "@/lib/types";

const ACCENT_VAR = { food: "var(--accent-food)", cocktail: "var(--accent-cocktail)" } as const;
const SCALE_OPTIONS = [0.5, 1, 2, 4];

export default function RecipeDetail({
  recipe,
  ingredients,
  userLists,
  isOwner,
  ownerName,
  preferredUnits,
  pantryItemNames,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  userLists: ShoppingList[];
  isOwner: boolean;
  ownerName?: string | null;
  preferredUnits?: UnitSystem | null;
  pantryItemNames?: string[];
}) {
  const router = useRouter();
  const { confirmDialog, alertDialog } = useDialog();
  const requireOnline = useOnlineGuard();
  const [showAddToList, setShowAddToList] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scale, setScale] = useState(1);

  const scaledIngredients = ingredients.map((ing) => ({
    ...ing,
    quantity: convertQuantity(scaleQuantity(ing.quantity, scale), preferredUnits ?? null),
  }));

  const isCocktail = recipe.kind === "cocktail";
  const accentVar = ACCENT_VAR[recipe.kind];
  const backHref = isCocktail ? "/recipes/cocktails" : "/recipes";
  const backLabel = isCocktail ? "Cocktails" : "Recipes";
  const noun = isCocktail ? "cocktail" : "recipe";
  const titleIcon = getTitleIcon(recipe.name, isCocktail ? "🍸" : "🍽️");

  const steps = (recipe.instructions ?? "")
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);

  async function handleDelete() {
    const ok = await confirmDialog(`Delete "${recipe.name}"? This can't be undone.`);
    if (!ok) return;
    if (!(await requireOnline())) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) {
      await alertDialog(error.message);
      setDeleting(false);
      return;
    }
    router.push(backHref);
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-[#14171c] px-0 py-0 sm:px-6 sm:py-10">
      <div className="relative mx-auto min-h-screen w-full max-w-2xl bg-white dark:bg-gray-900 shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl">
        <div
          className="pointer-events-none absolute top-0 bottom-0 left-10 w-px sm:left-12"
          style={{ backgroundColor: isCocktail ? "#c9a8e0" : "rgba(252,165,165,0.7)" }}
        />

        <header className="relative border-b border-gray-200 dark:border-gray-700 px-5 pt-6 pb-4 pl-16 sm:pl-20">
          <Link
            href={backHref}
            className="mb-2 inline-flex touch-manipulation items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
          <h1 className="-rotate-1 font-script text-3xl font-bold text-gray-900 dark:text-gray-100">
            <span className="mr-1">{titleIcon}</span>
            {recipe.name}
          </h1>
          {!isOwner && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Shared by {ownerName ?? "someone"} — view only
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddToList(true)}
              style={{ borderColor: accentVar, color: accentVar }}
              className="touch-manipulation rounded-full border bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium shadow-sm hover:opacity-80"
            >
              🛒 Add ingredients to a list
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => setShowShare(true)}
                  className="touch-manipulation rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  🔗 Share
                </button>
                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  className="touch-manipulation rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="touch-manipulation rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 shadow-sm hover:border-red-300 dark:hover:border-red-800 hover:text-red-500"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </header>

        <main className="px-5 py-5 pl-16 sm:pl-20">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
              Ingredients
            </p>
            {ingredients.length > 0 && (
              <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-medium dark:bg-gray-800">
                {SCALE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScale(option)}
                    className={`touch-manipulation rounded-md px-2 py-1 ${
                      scale === option
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {option === 0.5 ? "½×" : `${option}×`}
                  </button>
                ))}
              </div>
            )}
          </div>
          {scaledIngredients.length === 0 ? (
            <p className="font-hand text-lg text-gray-400 dark:text-gray-500">No ingredients yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {scaledIngredients.map((ing) => (
                <li
                  key={ing.id}
                  className="font-hand flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100"
                >
                  <span>{getItemIcon(ing.name)}</span>
                  {ing.name}
                  {ing.quantity && <span className="text-xs text-gray-400 dark:text-gray-500">×{ing.quantity}</span>}
                </li>
              ))}
            </ul>
          )}

          {steps.length > 0 && (
            <div className="mt-8">
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
                Instructions
              </p>
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="font-hand shrink-0 text-lg" style={{ color: accentVar }}>
                      {index + 1}.
                    </span>
                    <span className="font-hand text-lg text-gray-900 dark:text-gray-100">{step}</span>
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
          ingredients={scaledIngredients}
          userLists={userLists}
          pantryItemNames={pantryItemNames ?? []}
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
