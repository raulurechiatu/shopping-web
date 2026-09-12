// TheMealDB / TheCocktailDB: free, no signup, the "1" in the URL is the
// public test API key both projects document for open use. Matches our
// Food/Cocktails split exactly.

import type { createClient } from "@/lib/supabase/client";
import { expandSynonyms, termMatches } from "@/lib/ingredientSynonyms";
import type { RecipeKind } from "@/lib/types";

export type DiscoveredRecipe = {
  externalId: string;
  name: string;
  thumbnail: string | null;
  ingredients: { name: string; quantity: string | null }[];
  instructions: string;
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

// The full recipe is included (not just the stub) so a match can be
// previewed without a second fetch, and so "missing" can be computed
// against the actual ingredient list rather than just the search terms
// that happened to surface the recipe.
export type PantryMatch = {
  recipe: DiscoveredRecipe;
  haveIngredients: string[];
  missingIngredients: string[];
};

// filter.php only matches a single *exact* canonical ingredient string
// ("Light rum" and "Rum" are different ingredients to it, and plenty of
// real recipe ingredients — like "Light rum" itself — aren't even in
// either API's own ingredient list endpoint), so a pantry item of "rum"
// (or its Romanian synonym "rom") would never reliably surface a Cuba
// Libre through it. Both APIs' free tier does support listing every
// recipe by first letter with full ingredient detail already included, so
// "what can I make" instead fetches the whole catalog once (26 requests,
// cached for the session) and matches pantry synonyms against each
// recipe's actual ingredients directly — no exact-match guessing game.
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

let mealCatalogCache: Promise<DiscoveredRecipe[]> | null = null;
let cocktailCatalogCache: Promise<DiscoveredRecipe[]> | null = null;

// Persists the catalog across page loads/sessions (not just this tab's
// lifetime) so a repeat visit doesn't re-pay for 26 requests. Wrapped in
// try/catch throughout since localStorage can throw (quota, private
// browsing, disabled) — falling back to the in-memory cache is fine.
const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCatalogLocalCache(key: string): DiscoveredRecipe[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: DiscoveredRecipe[] };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CATALOG_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCatalogLocalCache(key: string, data: DiscoveredRecipe[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Quota exceeded or storage unavailable — the in-memory cache still
    // covers the rest of this session.
  }
}

async function fetchCatalogLetter(
  url: string,
  letter: string,
  listKey: "meals" | "drinks",
  count: number,
): Promise<DiscoveredRecipe[]> {
  try {
    const res = await fetch(`${url}?f=${letter}`);
    if (!res.ok) return [];
    const data = await res.json();
    return ((data[listKey] ?? []) as RawEntry[]).map((m) => ({
      externalId: (m.idMeal ?? m.idDrink)!,
      name: (m.strMeal ?? m.strDrink)!,
      thumbnail: m.strMealThumb ?? m.strDrinkThumb,
      ingredients: parseIngredients(m, count),
      instructions: m.strInstructions ?? "",
    }));
  } catch {
    return [];
  }
}

const MEAL_CACHE_KEY = "catalog-cache:meals";
const COCKTAIL_CACHE_KEY = "catalog-cache:cocktails";

async function listMealCatalog(): Promise<DiscoveredRecipe[]> {
  if (!mealCatalogCache) {
    const cached = readCatalogLocalCache(MEAL_CACHE_KEY);
    mealCatalogCache = cached
      ? Promise.resolve(cached)
      : Promise.all(
          LETTERS.map((l) => fetchCatalogLetter("https://www.themealdb.com/api/json/v1/1/search.php", l, "meals", 20)),
        ).then((pages) => {
          const flat = pages.flat();
          writeCatalogLocalCache(MEAL_CACHE_KEY, flat);
          return flat;
        });
  }
  return mealCatalogCache;
}

async function listCocktailCatalog(): Promise<DiscoveredRecipe[]> {
  if (!cocktailCatalogCache) {
    const cached = readCatalogLocalCache(COCKTAIL_CACHE_KEY);
    cocktailCatalogCache = cached
      ? Promise.resolve(cached)
      : Promise.all(
          LETTERS.map((l) =>
            fetchCatalogLetter("https://www.thecocktaildb.com/api/json/v1/1/search.php", l, "drinks", 15),
          ),
        ).then((pages) => {
          const flat = pages.flat();
          writeCatalogLocalCache(COCKTAIL_CACHE_KEY, flat);
          return flat;
        });
  }
  return cocktailCatalogCache;
}

// "What can I make?" — matches recipes against a pantry list (whatever's
// currently on the user's shopping lists), expanding each pantry item into
// its EN/RO synonyms before matching, and ranked by fewest missing
// ingredients first, so a recipe you're mostly stocked for still surfaces
// even if it needs one or two things you don't have.
export async function findRecipesFromIngredients(
  pantryItems: string[],
  kind: RecipeKind,
): Promise<PantryMatch[]> {
  const uniqueItems = Array.from(
    new Set(pantryItems.map((i) => i.trim().toLowerCase()).filter(Boolean)),
  ).slice(0, 15);
  if (uniqueItems.length === 0) return [];

  const pantrySynonyms = uniqueItems.flatMap((item) => expandSynonyms(item));
  const catalog = await (kind === "cocktail" ? listCocktailCatalog() : listMealCatalog());

  const matches: PantryMatch[] = [];
  for (const recipe of catalog) {
    const have: string[] = [];
    const missing: string[] = [];
    for (const ing of recipe.ingredients) {
      if (!ing.name.trim()) continue;
      const inPantry = pantrySynonyms.some((s) => termMatches(ing.name, s));
      (inPantry ? have : missing).push(ing.name);
    }
    if (have.length > 0) matches.push({ recipe, haveIngredients: have, missingIngredients: missing });
  }

  return matches
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
