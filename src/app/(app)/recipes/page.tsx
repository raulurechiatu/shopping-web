import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RecipesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <h1 className="w-full font-script text-3xl font-bold text-gray-900">Recipes</h1>

        {recipes && recipes.length > 0 && (
          <ul className="w-full space-y-2">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="font-hand block truncate rounded-xl bg-white px-4 py-3.5 text-lg text-gray-900 shadow-sm hover:bg-gray-50"
                >
                  {recipe.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {(!recipes || recipes.length === 0) && (
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
