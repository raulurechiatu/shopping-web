"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  findRecipesFromIngredients,
  importDiscoveredRecipe,
  GOOD_MATCH_RATIO,
  type PantryMatch,
} from "@/lib/recipeDiscovery";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import { useDialog } from "@/lib/DialogProvider";
import RecipePreviewModal from "@/components/RecipePreviewModal";
import type { RecipeKind } from "@/lib/types";
import type { UnitSystem } from "@/lib/unitConversion";

export default function WhatCanIMake({
  kind,
  pantryItems,
  preferredUnits,
}: {
  kind: RecipeKind;
  pantryItems: string[];
  preferredUnits?: UnitSystem | null;
}) {
  const router = useRouter();
  const requireOnline = useOnlineGuard();
  const { alertDialog } = useDialog();
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<PantryMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<PantryMatch | null>(null);
  const noun = kind === "cocktail" ? "cocktails" : "recipes";

  if (pantryItems.length === 0) return null;

  const goodMatches = matches.filter((m) => m.matchRatio >= GOOD_MATCH_RATIO);
  const ideaMatches = matches.filter((m) => m.matchRatio < GOOD_MATCH_RATIO);

  function renderMatch(match: PantryMatch) {
    return (
      <li
        key={match.recipe.externalId}
        className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm dark:bg-gray-900"
      >
        <button
          type="button"
          onClick={() => setPreviewing(match)}
          className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 text-left"
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
              {match.missingIngredients.length === 0
                ? `Have all ${match.haveIngredients.length} ingredients`
                : `Missing ${match.missingIngredients.length}: ${match.missingIngredients.join(", ")}`}
            </span>
          </div>
        </button>
        <button
          onClick={() => handleImport(match)}
          disabled={importingId === match.recipe.externalId}
          className="shrink-0 touch-manipulation rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-100"
        >
          {importingId === match.recipe.externalId ? "Adding..." : "➕ Add"}
        </button>
      </li>
    );
  }

  async function handleFind() {
    if (!(await requireOnline())) return;
    setOpen(true);
    setLoading(true);
    setSearched(true);
    setFetchFailed(false);
    const { matches: found, hadErrors } = await findRecipesFromIngredients(pantryItems, kind);
    setMatches(found);
    setFetchFailed(hadErrors && found.length === 0);
    setLoading(false);
  }

  async function handleImport(match: PantryMatch) {
    if (!(await requireOnline())) return;
    setImportingId(match.recipe.externalId);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await importDiscoveredRecipe(supabase, match.recipe, kind, user?.id);

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

          {!loading && fetchFailed && (
            <p className="font-hand text-center text-amber-600 dark:text-amber-400">
              ⚠️ Couldn&apos;t reach the recipe database. Check your connection and try again.
            </p>
          )}

          {!loading && goodMatches.length > 0 && <ul className="space-y-2">{goodMatches.map(renderMatch)}</ul>}

          {searched && !loading && !fetchFailed && matches.length === 0 && (
            <p className="font-hand text-center text-gray-400 dark:text-gray-500">
              Couldn&apos;t find any {noun} using what&apos;s on your lists.
            </p>
          )}

          {!loading && ideaMatches.length > 0 && (
            <div className={goodMatches.length > 0 ? "mt-5" : undefined}>
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                More ideas — you&apos;ll need to pick up a few things
              </p>
              <ul className="space-y-2">{ideaMatches.map(renderMatch)}</ul>
            </div>
          )}
        </>
      )}

      {previewing && (
        <RecipePreviewModal
          recipe={previewing.recipe}
          kind={kind}
          adding={importingId === previewing.recipe.externalId}
          onAdd={() => handleImport(previewing)}
          onClose={() => setPreviewing(null)}
          preferredUnits={preferredUnits}
          missingIngredients={previewing.missingIngredients}
        />
      )}
    </div>
  );
}
