import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecipesGrid from "@/components/RecipesGrid";
import DiscoverRecipes from "@/components/DiscoverRecipes";
import WhatCanIMake from "@/components/WhatCanIMake";
import type { Recipe, RecipeKind } from "@/lib/types";
import type { UnitSystem } from "@/lib/unitConversion";

const ACCENT: Record<RecipeKind, string> = { food: "#2b3a55", cocktail: "#6b3fa0" };

export default async function RecipeListPage({ kind }: { kind: RecipeKind }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: myMembership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: householdMemberRows } = myMembership
    ? await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", myMembership.household_id)
        .neq("user_id", user.id)
    : { data: [] };
  const householdMemberIds = (householdMemberRows ?? []).map((m) => m.user_id);

  const [{ data: owned }, { data: sharedRows }, { data: householdRecipes }] = await Promise.all([
    supabase
      .from("recipes")
      .select("*")
      .eq("owner_id", user.id)
      .eq("kind", kind)
      .order("created_at", { ascending: false }),
    supabase.from("recipe_shares").select("recipe_id, recipes(*)").eq("user_id", user.id),
    householdMemberIds.length
      ? supabase.from("recipes").select("*").in("owner_id", householdMemberIds).eq("kind", kind)
      : Promise.resolve({ data: [] }),
  ]);

  const shared = (sharedRows ?? [])
    .map((r) => r.recipes as unknown as Recipe)
    .filter((r) => r && r.kind === kind);

  const recipes = [
    ...(owned ?? []).map((r) => ({ recipe: r, isShared: false })),
    ...shared.map((r) => ({ recipe: r, isShared: true })),
    ...(householdRecipes ?? []).map((r) => ({ recipe: r, isShared: true })),
  ].sort((a, b) => b.recipe.created_at.localeCompare(a.recipe.created_at));

  // Pulled in alongside the recipes so the search box can match against
  // ingredients too, not just the recipe name.
  const { data: ingredientRows } = recipes.length
    ? await supabase
        .from("recipe_ingredients")
        .select("recipe_id, name, quantity")
        .in(
          "recipe_id",
          recipes.map((r) => r.recipe.id),
        )
    : { data: [] };

  const ingredientsByRecipeId = new Map<string, { name: string; quantity: string | null }[]>();
  for (const ing of ingredientRows ?? []) {
    if (!ingredientsByRecipeId.has(ing.recipe_id)) ingredientsByRecipeId.set(ing.recipe_id, []);
    ingredientsByRecipeId.get(ing.recipe_id)!.push(ing);
  }

  const isCocktail = kind === "cocktail";
  const accent = ACCENT[kind];
  const noun = isCocktail ? "cocktail" : "recipe";

  // "What can I make?" pantry signal — prefer the household's shared
  // pantry; if there's no household yet, fall back to whatever's on the
  // lists so the feature isn't empty from day one.
  let pantryItems: string[] = [];
  if (myMembership) {
    const { data: householdItems } = await supabase
      .from("household_items")
      .select("name")
      .eq("household_id", myMembership.household_id);
    pantryItems = Array.from(new Set((householdItems ?? []).map((r) => r.name)));
  }

  if (pantryItems.length === 0) {
    const { data: memberLists } = await supabase.from("list_members").select("list_id").eq("user_id", user.id);
    const listIds = (memberLists ?? []).map((m) => m.list_id);
    const { data: pantryRows } = listIds.length
      ? await supabase.from("list_items").select("name").in("list_id", listIds)
      : { data: [] };
    pantryItems = Array.from(new Set((pantryRows ?? []).map((r) => r.name)));
  }

  const { data: profile } = user.is_anonymous
    ? { data: null }
    : await supabase.from("profiles").select("preferred_units").eq("id", user.id).maybeSingle();
  const preferredUnits = (profile?.preferred_units as UnitSystem | null) ?? null;

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

        <RecipesGrid
          recipes={recipes.map((r) => ({
            ...r,
            ingredients: ingredientsByRecipeId.get(r.recipe.id) ?? [],
          }))}
          emptyMessage={
            isCocktail
              ? "No cocktails yet — add one and its ingredients can go straight to a shopping list."
              : "No recipes yet — add one and its ingredients can go straight to a shopping list."
          }
        />

        <Link
          href={isCocktail ? "/recipes/cocktails/new" : "/recipes/new"}
          style={{ backgroundColor: accent }}
          className="w-full max-w-sm touch-manipulation rounded-lg px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90"
        >
          ➕ New {noun}
        </Link>

        <WhatCanIMake kind={kind} pantryItems={pantryItems} preferredUnits={preferredUnits} />

        <DiscoverRecipes kind={kind} preferredUnits={preferredUnits} />
      </div>
    </div>
  );
}
