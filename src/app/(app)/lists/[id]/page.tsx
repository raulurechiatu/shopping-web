import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShoppingListView from "@/components/ShoppingListView";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  // RLS (is_list_member) already scopes this to lists the user belongs to,
  // so a non-member or bad id simply comes back empty.
  const { data: list } = await supabase.from("lists").select("*").eq("id", id).maybeSingle();

  if (!list) {
    redirect("/lists");
  }

  const isOwner = list.owner_id === user.id;

  const [{ data: items }, { data: favorites }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from("list_items")
      .select("*")
      .eq("list_id", list.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("list_item_catalog")
      .select("*")
      .eq("list_id", list.id)
      .eq("is_favorite", true)
      .order("name", { ascending: true }),
    isOwner
      ? Promise.resolve({ data: null })
      : supabase.from("profiles").select("full_name").eq("id", list.owner_id).maybeSingle(),
  ]);

  return (
    <ShoppingListView
      list={list}
      initialItems={items ?? []}
      initialFavorites={favorites ?? []}
      isOwner={isOwner}
      ownerName={ownerProfile?.full_name ?? null}
    />
  );
}
