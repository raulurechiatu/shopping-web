"use client";

import { convertQuantity, type UnitSystem } from "@/lib/unitConversion";
import type { DiscoveredRecipe } from "@/lib/recipeDiscovery";
import type { RecipeKind } from "@/lib/types";

export default function RecipePreviewModal({
  recipe,
  kind,
  adding,
  onAdd,
  onClose,
  preferredUnits,
  missingIngredients,
}: {
  recipe: DiscoveredRecipe;
  kind: RecipeKind;
  adding: boolean;
  onAdd: () => void;
  onClose: () => void;
  preferredUnits?: UnitSystem | null;
  // From a pantry match — when present, each ingredient line shows whether
  // you already have it. Absent for plain Discover-search previews, which
  // have no pantry comparison to show.
  missingIngredients?: string[];
}) {
  const missingSet = missingIngredients ? new Set(missingIngredients) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-hand text-2xl text-gray-900 dark:text-gray-100">{recipe.name}</h2>
          <button
            onClick={onClose}
            className="shrink-0 touch-manipulation rounded-full p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {recipe.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.thumbnail}
            alt=""
            className="mb-4 h-48 w-full rounded-xl bg-gray-100 object-contain dark:bg-gray-800"
          />
        )}

        {recipe.ingredients.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Ingredients
            </p>
            <ul className="space-y-1 text-sm">
              {recipe.ingredients.map((ing, i) => {
                const missing = missingSet?.has(ing.name);
                return (
                  <li
                    key={i}
                    className={missingSet ? (missing ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100") : "text-gray-700 dark:text-gray-300"}
                  >
                    {missingSet && <span className="mr-1">{missing ? "⬜" : "✅"}</span>}
                    {ing.name}
                    {ing.quantity && (
                      <span className="text-gray-400 dark:text-gray-500">
                        {" "}
                        — {convertQuantity(ing.quantity, preferredUnits ?? null)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {recipe.instructions && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Instructions
            </p>
            <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{recipe.instructions}</p>
          </div>
        )}

        <button
          onClick={onAdd}
          disabled={adding}
          className="w-full touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
        >
          {adding ? "Adding..." : `➕ Add this ${kind === "cocktail" ? "cocktail" : "recipe"}`}
        </button>
      </div>
    </div>
  );
}
