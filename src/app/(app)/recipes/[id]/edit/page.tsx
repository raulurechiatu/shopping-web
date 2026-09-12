import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecipeForm from "@/components/RecipeForm";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: recipe }, { data: ingredients }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", id)
      .order("position", { ascending: true }),
  ]);

  if (!recipe) {
    redirect("/recipes");
  }

  const isCocktail = recipe.kind === "cocktail";

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-[#14171c] px-4 py-10">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="font-script text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isCocktail ? "Edit Cocktail" : "Edit Recipe"}
          </h1>
          <Link href={`/recipes/${id}`} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700">
            Cancel
          </Link>
        </div>
        <div className="w-full rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm">
          <RecipeForm
            recipeId={recipe.id}
            kind={recipe.kind}
            initialName={recipe.name}
            initialInstructions={recipe.instructions ?? ""}
            initialIngredients={(ingredients ?? []).map((ing) => ({
              name: ing.name,
              quantity: ing.quantity ?? "",
            }))}
            initialImageUrl={recipe.image_url ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
