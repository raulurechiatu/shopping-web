"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  findRecipesFromIngredients,
  lookupMealRecipe,
  lookupCocktailRecipe,
  importDiscoveredRecipe,
  type PantryMatch,
} from "@/lib/recipeDiscovery";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import { useDialog } from "@/lib/DialogProvider";
import type { RecipeKind } from "@/lib/types";

export default function WhatCanIMake({ kind, pantryItems }: { kind: RecipeKind; pantryItems: string[] }) {
  const router = useRouter();
  const requireOnline = useOnlineGuard();
  const { alertDialog } = useDialog();
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<PantryMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const noun = kind === "cocktail" ? "cocktails" : "recipes";

  if (pantryItems.length === 0) return null;

  async function handleFind() {
    if (!(await requireOnline())) return;
    setOpen(true);
    setLoading(true);
    setSearched(true);
    const found = await findRecipesFromIngredients(pantryItems, kind);
    setMatches(found);
    setLoading(false);
  }

  async function handleImport(match: PantryMatch) {
    if (!(await requireOnline())) return;
    setImportingId(match.recipe.externalId);

    const full =
      kind === "cocktail"
        ? await lookupCocktailRecipe(match.recipe.externalId)
        : await lookupMealRecipe(match.recipe.externalId);

    if (!full) {
      await alertDialog(`Couldn't load this ${kind === "cocktail" ? "cocktail" : "recipe"}.`);
      setImportingId(null);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await importDiscoveredRecipe(supabase, full, kind, user?.id);

    if ("error" in result) {
      await alertDialog(result.error);
      setImportingId(null);
      return;
    }

    router.push(`/recipes/${result.id}`);
  }

  return (
    <div className="w-full">
      {!open ? (
        <button
          onClick={handleFind}
          className="font-hand flex w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-800"
        >
          🥕 What can I make from my {pantryItems.length} item{pantryItems.length === 1 ? "" : "s"}?
        </button>
      ) : (
        <>
          <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            What can I make?
          </p>

          {loading && (
            <p className="font-hand text-center text-gray-400 dark:text-gray-500">Checking your items...</p>
          )}

          {!loading && matches.length > 0 && (
            <ul className="space-y-2">
              {matches.map((match) => (
                <li
                  key={match.recipe.externalId}
                  className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm dark:bg-gray-900"
                >
                  {match.recipe.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={match.recipe.thumbnail}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-hand block truncate text-base text-gray-900 dark:text-gray-100">
                      {match.recipe.name}
                    </span>
                    <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                      Uses {match.matchedIngredients.length}: {match.matchedIngredients.join(", ")}
                    </span>
                  </div>
                  <button
                    onClick={() => handleImport(match)}
                    disabled={importingId === match.recipe.externalId}
                    className="shrink-0 touch-manipulation rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-100"
                  >
                    {importingId === match.recipe.externalId ? "Adding..." : "➕ Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searched && !loading && matches.length === 0 && (
            <p className="font-hand text-center text-gray-400 dark:text-gray-500">
              Couldn&apos;t find any {noun} using what&apos;s on your lists.
            </p>
          )}
        </>
      )}
    </div>
  );
}
