import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecipeDetail from "@/components/RecipeDetail";
import type { ShoppingList } from "@/lib/types";
import type { UnitSystem } from "@/lib/unitConversion";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const [{ data: recipe }, { data: ingredients }, { data: memberships }, { data: profile }, { data: membership }] =
    await Promise.all([
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
      user.is_anonymous
        ? Promise.resolve({ data: null })
        : supabase.from("profiles").select("preferred_units").eq("id", user.id).maybeSingle(),
      user.is_anonymous
        ? Promise.resolve({ data: null })
        : supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle(),
    ]);

  if (!recipe) {
    redirect("/recipes");
  }

  const { data: pantryItems } = membership
    ? await supabase.from("household_items").select("name").eq("household_id", membership.household_id)
    : { data: [] };
  const pantryItemNames = (pantryItems ?? []).map((i) => i.name);

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
      preferredUnits={(profile?.preferred_units as UnitSystem | null) ?? null}
      pantryItemNames={pantryItemNames}
    />
  );
}
