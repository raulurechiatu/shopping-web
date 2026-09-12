import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Ingredient = { name: string; quantity: string };

// Builds a TheMealDB/TheCocktailDB-shaped raw entry (strIngredient1..N /
// strMeasure1..N pairs) from a plain {name, quantity} list, matching what
// parseIngredients in recipeDiscovery.ts expects to read.
function rawEntry(idField: "idMeal" | "idDrink", nameField: "strMeal" | "strDrink", id: string, name: string, ingredients: Ingredient[]) {
  const entry: Record<string, string> = { [idField]: id, [nameField]: name, strInstructions: "Mix it all together." };
  ingredients.forEach((ing, i) => {
    entry[`strIngredient${i + 1}`] = ing.name;
    entry[`strMeasure${i + 1}`] = ing.quantity;
  });
  return entry;
}

// Routes a fetch mock's calls by the `?f=<letter>` query param used by the
// catalog-by-letter endpoint, so a test only needs to say what each letter
// returns instead of hand-rolling URL parsing every time.
function catalogFetchMock(byLetter: Record<string, Record<string, unknown>[]>, listKey: "meals" | "drinks") {
  return vi.fn(async (url: string) => {
    const letter = new URL(url).searchParams.get("f") ?? "";
    return {
      ok: true,
      json: async () => ({ [listKey]: byLetter[letter] ?? [] }),
    } as Response;
  });
}

describe("findRecipesFromIngredients", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes have/missing ingredients and a match ratio, sorted best-match first", async () => {
    const byLetter: Record<string, Record<string, unknown>[]> = {
      c: [
        rawEntry("idMeal", "strMeal", "1", "Chicken Curry", [
          { name: "Chicken", quantity: "1" },
          { name: "Curry powder", quantity: "1 tbsp" },
          { name: "Onion", quantity: "1" },
        ]),
      ],
      s: [
        rawEntry("idMeal", "strMeal", "2", "Spaghetti", [
          { name: "Pasta", quantity: "200g" },
          { name: "Garlic", quantity: "2 cloves" },
          { name: "Tomato", quantity: "3" },
          { name: "Basil", quantity: "a few leaves" },
          { name: "Cheese", quantity: "50g" },
        ]),
      ],
    };
    vi.stubGlobal("fetch", catalogFetchMock(byLetter, "meals"));

    const { findRecipesFromIngredients } = await import("@/lib/recipeDiscovery");
    const { matches, hadErrors } = await findRecipesFromIngredients(["chicken", "onion", "cheese"], "food");

    expect(hadErrors).toBe(false);
    expect(matches).toHaveLength(2);

    const curry = matches.find((m) => m.recipe.name === "Chicken Curry")!;
    expect(curry.haveIngredients).toEqual(["Chicken", "Onion"]);
    expect(curry.missingIngredients).toEqual(["Curry powder"]);
    expect(curry.matchRatio).toBeCloseTo(2 / 3);

    const spaghetti = matches.find((m) => m.recipe.name === "Spaghetti")!;
    expect(spaghetti.haveIngredients).toEqual(["Cheese"]);
    expect(spaghetti.matchRatio).toBeCloseTo(1 / 5);

    // Best match ratio first.
    expect(matches[0].recipe.name).toBe("Chicken Curry");
  });

  it("excludes recipes that match none of the pantry items", async () => {
    const byLetter = {
      p: [rawEntry("idMeal", "strMeal", "1", "Plain Toast", [{ name: "Bread", quantity: "2 slices" }])],
    };
    vi.stubGlobal("fetch", catalogFetchMock(byLetter, "meals"));

    const { findRecipesFromIngredients } = await import("@/lib/recipeDiscovery");
    const { matches } = await findRecipesFromIngredients(["chicken"], "food");
    expect(matches).toEqual([]);
  });

  it("matches pantry items through EN/RO synonyms", async () => {
    const byLetter = {
      c: [rawEntry("idDrink", "strDrink", "1", "Cuba Libre", [
        { name: "Light rum", quantity: "1 shot" },
        { name: "Cola", quantity: "top up" },
      ])],
    };
    vi.stubGlobal("fetch", catalogFetchMock(byLetter, "drinks"));

    const { findRecipesFromIngredients } = await import("@/lib/recipeDiscovery");
    // "rom" is the Romanian synonym for "rum".
    const { matches } = await findRecipesFromIngredients(["rom", "cola"], "cocktail");
    expect(matches).toHaveLength(1);
    expect(matches[0].haveIngredients).toEqual(["Light rum", "Cola"]);
    expect(matches[0].matchRatio).toBe(1);
  });

  it("reports hadErrors on a network failure instead of silently returning an empty result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { findRecipesFromIngredients } = await import("@/lib/recipeDiscovery");
    const { matches, hadErrors } = await findRecipesFromIngredients(["chicken"], "food");
    expect(hadErrors).toBe(true);
    expect(matches).toEqual([]);
  });

  it("retries the catalog fetch after a failure instead of caching the broken result", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", failing);

    const { findRecipesFromIngredients } = await import("@/lib/recipeDiscovery");
    const first = await findRecipesFromIngredients(["chicken"], "food");
    expect(first.hadErrors).toBe(true);

    const byLetter = {
      c: [rawEntry("idMeal", "strMeal", "1", "Chicken Soup", [{ name: "Chicken", quantity: "1" }])],
    };
    vi.stubGlobal("fetch", catalogFetchMock(byLetter, "meals"));

    const second = await findRecipesFromIngredients(["chicken"], "food");
    expect(second.hadErrors).toBe(false);
    expect(second.matches).toHaveLength(1);
    expect(second.matches[0].recipe.name).toBe("Chicken Soup");
  });

  it("returns nothing without making a request when the pantry is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { findRecipesFromIngredients } = await import("@/lib/recipeDiscovery");
    const { matches, hadErrors } = await findRecipesFromIngredients([], "food");
    expect(matches).toEqual([]);
    expect(hadErrors).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("searchMealRecipes / searchCocktailRecipes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a successful search response into DiscoveredRecipe objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meals: [rawEntry("idMeal", "strMeal", "52772", "Teriyaki Chicken Casserole", [{ name: "Chicken", quantity: "1" }])],
        }),
      }),
    );
    const { searchMealRecipes } = await import("@/lib/recipeDiscovery");
    const results = await searchMealRecipes("chicken");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Teriyaki Chicken Casserole");
    expect(results[0].ingredients).toEqual([{ name: "Chicken", quantity: "1" }]);
  });

  it("throws RecipeFetchError on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const { searchMealRecipes, RecipeFetchError } = await import("@/lib/recipeDiscovery");
    await expect(searchMealRecipes("chicken")).rejects.toBeInstanceOf(RecipeFetchError);
  });

  it("throws RecipeFetchError when fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { searchCocktailRecipes, RecipeFetchError } = await import("@/lib/recipeDiscovery");
    await expect(searchCocktailRecipes("margarita")).rejects.toBeInstanceOf(RecipeFetchError);
  });
});

describe("importDiscoveredRecipe", () => {
  it("creates the recipe then its ingredients, returning the new id", async () => {
    const recipe = {
      externalId: "1",
      name: "Test Recipe",
      thumbnail: null,
      ingredients: [{ name: "Egg", quantity: "2" }],
      instructions: "Step one.\nStep two.",
    };

    const insertedIngredients: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "recipes") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: "new-recipe-id" }, error: null }),
              }),
            }),
          };
        }
        if (table === "recipe_ingredients") {
          return {
            insert: async (rows: unknown[]) => {
              insertedIngredients.push(...rows);
              return { error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { importDiscoveredRecipe } = await import("@/lib/recipeDiscovery");
    const result = await importDiscoveredRecipe(supabase, recipe, "food", "user-1");

    expect(result).toEqual({ id: "new-recipe-id" });
    expect(insertedIngredients).toEqual([
      { recipe_id: "new-recipe-id", name: "Egg", quantity: "2", position: 0 },
    ]);
  });

  it("surfaces the error message when creating the recipe fails", async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "duplicate key" } }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { importDiscoveredRecipe } = await import("@/lib/recipeDiscovery");
    const result = await importDiscoveredRecipe(
      supabase,
      { externalId: "1", name: "X", thumbnail: null, ingredients: [], instructions: "" },
      "food",
      "user-1",
    );
    expect(result).toEqual({ error: "duplicate key" });
  });
});
