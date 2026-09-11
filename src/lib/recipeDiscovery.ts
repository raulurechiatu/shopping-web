// TheMealDB / TheCocktailDB: free, no signup, the "1" in the URL is the
// public test API key both projects document for open use. Matches our
// Food/Cocktails split exactly.

import type { createClient } from "@/lib/supabase/client";
import type { RecipeKind } from "@/lib/types";

export type DiscoveredRecipe = {
  externalId: string;
  name: string;
  thumbnail: string | null;
  ingredients: { name: string; quantity: string | null }[];
  instructions: string;
};

export type RecipeStub = {
  externalId: string;
  name: string;
  thumbnail: string | null;
};

type RawEntry = Record<string, string | null>;

function parseIngredients(item: RawEntry, count: number): { name: string; quantity: string | null }[] {
  const result: { name: string; quantity: string | null }[] = [];
  for (let i = 1; i <= count; i++) {
    const name = item[`strIngredient${i}`]?.trim();
    const measure = item[`strMeasure${i}`]?.trim();
    if (name) result.push({ name, quantity: measure || null });
  }
  return result;
}

export async function searchMealRecipes(query: string): Promise<DiscoveredRecipe[]> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.meals ?? []) as RawEntry[]).map((m) => ({
      externalId: m.idMeal!,
      name: m.strMeal!,
      thumbnail: m.strMealThumb,
      ingredients: parseIngredients(m, 20),
      instructions: m.strInstructions ?? "",
    }));
  } catch {
    return [];
  }
}

export async function searchCocktailRecipes(query: string): Promise<DiscoveredRecipe[]> {
  try {
    const res = await fetch(
      `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.drinks ?? []) as RawEntry[]).map((m) => ({
      externalId: m.idDrink!,
      name: m.strDrink!,
      thumbnail: m.strDrinkThumb,
      ingredients: parseIngredients(m, 15),
      instructions: m.strInstructions ?? "",
    }));
  } catch {
    return [];
  }
}

// filter.php only accepts a single ingredient on the free tier (matching
// on several at once is a Patreon-only feature), so "what can I make"
// runs one filter call per pantry item and merges the results client-side.
async function searchMealsByIngredient(ingredient: string): Promise<RecipeStub[]> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.meals ?? []) as RawEntry[]).map((m) => ({
      externalId: m.idMeal!,
      name: m.strMeal!,
      thumbnail: m.strMealThumb,
    }));
  } catch {
    return [];
  }
}

async function searchCocktailsByIngredient(ingredient: string): Promise<RecipeStub[]> {
  try {
    const res = await fetch(
      `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.drinks ?? []) as RawEntry[]).map((m) => ({
      externalId: m.idDrink!,
      name: m.strDrink!,
      thumbnail: m.strDrinkThumb,
    }));
  } catch {
    return [];
  }
}

export async function lookupMealRecipe(id: string): Promise<DiscoveredRecipe | null> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const m = (data.meals ?? [])[0] as RawEntry | undefined;
    if (!m) return null;
    return {
      externalId: m.idMeal!,
      name: m.strMeal!,
      thumbnail: m.strMealThumb,
      ingredients: parseIngredients(m, 20),
      instructions: m.strInstructions ?? "",
    };
  } catch {
    return null;
  }
}

export async function lookupCocktailRecipe(id: string): Promise<DiscoveredRecipe | null> {
  try {
    const res = await fetch(
      `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const m = (data.drinks ?? [])[0] as RawEntry | undefined;
    if (!m) return null;
    return {
      externalId: m.idDrink!,
      name: m.strDrink!,
      thumbnail: m.strDrinkThumb,
      ingredients: parseIngredients(m, 15),
      instructions: m.strInstructions ?? "",
    };
  } catch {
    return null;
  }
}

// The full recipe is included (not just the stub) so a match can be
// previewed without a second fetch, and so "missing" can be computed
// against the actual ingredient list rather than just the search terms
// that happened to surface the recipe.
export type PantryMatch = {
  recipe: DiscoveredRecipe;
  haveIngredients: string[];
  missingIngredients: string[];
};

// "What can I make?" — matches recipes against a pantry list (whatever's
// currently on the user's shopping lists), one ingredient-filter call per
// pantry item. Candidates are then fetched in full and ranked by fewest
// missing ingredients first, so a recipe you're mostly stocked for still
// surfaces even if it needs one or two things you don't have.
export async function findRecipesFromIngredients(
  pantryItems: string[],
  kind: RecipeKind,
): Promise<PantryMatch[]> {
  const uniqueItems = Array.from(
    new Set(pantryItems.map((i) => i.trim().toLowerCase()).filter(Boolean)),
  ).slice(0, 15);
  const searchFn = kind === "cocktail" ? searchCocktailsByIngredient : searchMealsByIngredient;
  const lookupFn = kind === "cocktail" ? lookupCocktailRecipe : lookupMealRecipe;

  const results = await Promise.all(
    uniqueItems.map(async (ingredient) => ({ ingredient, stubs: await searchFn(ingredient) })),
  );

  const byId = new Map<string, { stub: RecipeStub; matchedCount: number }>();
  for (const { stubs } of results) {
    for (const stub of stubs) {
      const existing = byId.get(stub.externalId);
      if (existing) existing.matchedCount += 1;
      else byId.set(stub.externalId, { stub, matchedCount: 1 });
    }
  }

  // Fetching full details is a second call per candidate, so bound the
  // pool (by raw match count) before paying for it.
  const candidates = Array.from(byId.values())
    .sort((a, b) => b.matchedCount - a.matchedCount)
    .slice(0, 20);

  const withDetails = await Promise.all(
    candidates.map(async ({ stub }): Promise<PantryMatch | null> => {
      const full = await lookupFn(stub.externalId);
      if (!full) return null;
      const have: string[] = [];
      const missing: string[] = [];
      for (const ing of full.ingredients) {
        const name = ing.name.trim().toLowerCase();
        if (!name) continue;
        const inPantry = uniqueItems.some((p) => name.includes(p) || p.includes(name));
        (inPantry ? have : missing).push(ing.name);
      }
      return { recipe: full, haveIngredients: have, missingIngredients: missing };
    }),
  );

  return withDetails
    .filter((m): m is PantryMatch => m !== null && m.haveIngredients.length > 0)
    .sort(
      (a, b) =>
        a.missingIngredients.length - b.missingIngredients.length ||
        b.haveIngredients.length - a.haveIngredients.length,
    )
    .slice(0, 12);
}

// Shared by the "Discover" search and "What can I make?" — both end with
// the same "import this external recipe as my own" step.
export async function importDiscoveredRecipe(
  supabase: ReturnType<typeof createClient>,
  recipe: DiscoveredRecipe,
  kind: RecipeKind,
  ownerId: string | undefined,
): Promise<{ id: string } | { error: string }> {
  const instructions = recipe.instructions
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");

  const { data: created, error } = await supabase
    .from("recipes")
    .insert({ name: recipe.name, instructions: instructions || null, owner_id: ownerId, kind })
    .select()
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Couldn't import this recipe." };
  }

  if (recipe.ingredients.length > 0) {
    const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
      recipe.ingredients.map((ing, index) => ({
        recipe_id: created.id,
        name: ing.name,
        quantity: ing.quantity,
        position: index,
      })),
    );
    if (ingredientsError) return { error: ingredientsError.message };
  }

  return { id: created.id };
}
