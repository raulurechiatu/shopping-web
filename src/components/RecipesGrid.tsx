"use client";

import { useState } from "react";
import RecipeRow from "@/components/RecipeRow";
import type { Recipe } from "@/lib/types";

export default function RecipesGrid({
  recipes,
  emptyMessage,
}: {
  recipes: { recipe: Recipe; isShared: boolean }[];
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? recipes.filter((r) => r.recipe.name.toLowerCase().includes(trimmed))
    : recipes;

  return (
    <>
      {recipes.length > 4 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search recipes..."
          className="font-hand w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      )}

      {filtered.length > 0 && (
        <ul className="w-full space-y-2">
          {filtered.map(({ recipe, isShared }) => (
            <RecipeRow key={recipe.id} recipe={recipe} isShared={isShared} />
          ))}
        </ul>
      )}

      {filtered.length === 0 && trimmed && (
        <p className="font-hand text-center text-gray-400 dark:text-gray-500">
          No recipes match &ldquo;{query}&rdquo;.
        </p>
      )}

      {recipes.length === 0 && (
        <p className="font-hand text-center text-lg text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      )}
    </>
  );
}
