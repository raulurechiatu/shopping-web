// TheMealDB / TheCocktailDB: free, no signup, the "1" in the URL is the
// public test API key both projects document for open use. Matches our
// Food/Cocktails split exactly.

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
