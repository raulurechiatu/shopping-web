"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  searchMealRecipes,
  searchCocktailRecipes,
  importDiscoveredRecipe,
  type DiscoveredRecipe,
} from "@/lib/recipeDiscovery";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import { useDialog } from "@/lib/DialogProvider";
import RecipePreviewModal from "@/components/RecipePreviewModal";
import type { RecipeKind } from "@/lib/types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

export default function DiscoverRecipes({ kind }: { kind: RecipeKind }) {
  const router = useRouter();
  const requireOnline = useOnlineGuard();
  const { alertDialog } = useDialog();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveredRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<DiscoveredRecipe | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    if (!navigator.onLine) {
      // Autocomplete shouldn't interrupt typing with a dialog — just stay
      // quiet until the explicit Add action needs to check again.
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = kind === "cocktail" ? await searchCocktailRecipes(trimmed) : await searchMealRecipes(trimmed);
      if (thisRequestId !== requestIdRef.current) return; // a newer keystroke superseded this
      setResults(found);
      setSearched(true);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, kind]);

  async function handleImport(recipe: DiscoveredRecipe) {
    if (!(await requireOnline())) return;
    setImportingId(recipe.externalId);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await importDiscoveredRecipe(supabase, recipe, kind, user?.id);

    if ("error" in result) {
      await alertDialog(result.error);
      setImportingId(null);
      return;
    }

    router.push(`/recipes/${result.id}`);
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
        Discover {kind === "cocktail" ? "cocktails" : "recipes"}
      </p>
      <div className="relative mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === "cocktail" ? "e.g. margarita" : "e.g. chicken curry"}
          className="font-hand w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
          {loading ? "…" : "🔍"}
        </span>
      </div>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.externalId}
              className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm dark:bg-gray-900"
            >
              <button
                type="button"
                onClick={() => setPreviewing(r)}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 text-left"
              >
                {r.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnail}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                <span className="font-hand min-w-0 flex-1 truncate text-base text-gray-900 dark:text-gray-100">
                  {r.name}
                </span>
              </button>
              <button
                onClick={() => handleImport(r)}
                disabled={importingId === r.externalId}
                className="shrink-0 touch-manipulation rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-100"
              >
                {importingId === r.externalId ? "Adding..." : "➕ Add"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="font-hand text-center text-gray-400 dark:text-gray-500">
          No {kind === "cocktail" ? "cocktails" : "recipes"} found for &ldquo;{query.trim()}&rdquo;.
        </p>
      )}

      {previewing && (
        <RecipePreviewModal
          recipe={previewing}
          kind={kind}
          adding={importingId === previewing.externalId}
          onAdd={() => handleImport(previewing)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
