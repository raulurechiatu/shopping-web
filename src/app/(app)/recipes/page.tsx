import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecipeRow from "@/components/RecipeRow";
import type { Recipe } from "@/lib/types";

export default async function RecipesPage() {
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
      .order("created_at", { ascending: false }),
    supabase.from("recipe_shares").select("recipe_id, recipes(*)").eq("user_id", user.id),
  ]);

  const shared = (sharedRows ?? [])
    .map((r) => r.recipes as unknown as Recipe)
    .filter(Boolean);

  const recipes = [
    ...(owned ?? []).map((r) => ({ recipe: r, isShared: false })),
    ...shared.map((r) => ({ recipe: r, isShared: true })),
  ].sort((a, b) => b.recipe.created_at.localeCompare(a.recipe.created_at));

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <h1 className="w-full font-script text-3xl font-bold text-gray-900">Recipes</h1>

        {recipes.length > 0 && (
          <ul className="w-full space-y-2">
            {recipes.map(({ recipe, isShared }) => (
              <RecipeRow key={recipe.id} recipe={recipe} isShared={isShared} />
            ))}
          </ul>
        )}

        {recipes.length === 0 && (
          <p className="font-hand text-center text-lg text-gray-500">
            No recipes yet — add one and its ingredients can go straight to a shopping list.
          </p>
        )}

        <Link
          href="/recipes/new"
          className="w-full max-w-sm touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#1f2c42]"
        >
          + New recipe
        </Link>
      </div>
    </div>
  );
}
