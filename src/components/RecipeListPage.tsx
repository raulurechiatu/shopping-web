import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecipeRow from "@/components/RecipeRow";
import type { Recipe, RecipeKind } from "@/lib/types";

const ACCENT: Record<RecipeKind, string> = { food: "#2b3a55", cocktail: "#6b3fa0" };

export default async function RecipeListPage({ kind }: { kind: RecipeKind }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const [{ data: owned }, { data: sharedRows }] = await Promise.all([
    supabase
      .from("recipes")
      .select("*")
      .eq("owner_id", user.id)
      .eq("kind", kind)
      .order("created_at", { ascending: false }),
    supabase.from("recipe_shares").select("recipe_id, recipes(*)").eq("user_id", user.id),
  ]);

  const shared = (sharedRows ?? [])
    .map((r) => r.recipes as unknown as Recipe)
    .filter((r) => r && r.kind === kind);

  const recipes = [
    ...(owned ?? []).map((r) => ({ recipe: r, isShared: false })),
    ...shared.map((r) => ({ recipe: r, isShared: true })),
  ].sort((a, b) => b.recipe.created_at.localeCompare(a.recipe.created_at));

  const isCocktail = kind === "cocktail";
  const accent = ACCENT[kind];
  const noun = isCocktail ? "cocktail" : "recipe";

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-[#14171c] px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <h1 className="w-full font-script text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isCocktail ? "🍸 Cocktails" : "Recipes"}
        </h1>

        <div className="flex w-full gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-sm font-medium">
          <Link
            href="/recipes"
            className={`flex-1 rounded-md py-2 text-center ${
              !isCocktail ? "bg-white dark:bg-gray-900 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            🍽️ Food
          </Link>
          <Link
            href="/recipes/cocktails"
            className={`flex-1 rounded-md py-2 text-center ${
              isCocktail ? "bg-white dark:bg-gray-900 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            🍸 Cocktails
          </Link>
        </div>

        {recipes.length > 0 && (
          <ul className="w-full space-y-2">
            {recipes.map(({ recipe, isShared }) => (
              <RecipeRow key={recipe.id} recipe={recipe} isShared={isShared} />
            ))}
          </ul>
        )}

        {recipes.length === 0 && (
          <p className="font-hand text-center text-lg text-gray-500 dark:text-gray-400">
            {isCocktail
              ? "No cocktails yet — add one and its ingredients can go straight to a shopping list."
              : "No recipes yet — add one and its ingredients can go straight to a shopping list."}
          </p>
        )}

        <Link
          href={isCocktail ? "/recipes/cocktails/new" : "/recipes/new"}
          style={{ backgroundColor: accent }}
          className="w-full max-w-sm touch-manipulation rounded-lg px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90"
        >
          ➕ New {noun}
        </Link>
      </div>
    </div>
  );
}
