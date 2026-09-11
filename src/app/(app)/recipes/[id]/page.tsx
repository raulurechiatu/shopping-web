import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecipeDetail from "@/components/RecipeDetail";
import type { ShoppingList } from "@/lib/types";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const [{ data: recipe }, { data: ingredients }, { data: memberships }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("list_members")
      .select("list_id, lists(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }),
  ]);

  if (!recipe) {
    redirect("/recipes");
  }

  const isOwner = recipe.owner_id === user.id;
  const ownerProfile = isOwner
    ? null
    : (await supabase.from("profiles").select("full_name").eq("id", recipe.owner_id).maybeSingle()).data;

  const userLists = (memberships ?? [])
    .map((m) => m.lists as unknown as ShoppingList)
    .filter(Boolean);

  return (
    <RecipeDetail
      recipe={recipe}
      ingredients={ingredients ?? []}
      userLists={userLists}
      isOwner={isOwner}
      ownerName={ownerProfile?.full_name ?? null}
    />
  );
}
