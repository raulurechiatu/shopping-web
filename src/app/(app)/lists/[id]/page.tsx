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

  const [{ data: items }, { data: catalog }] = await Promise.all([
    supabase
      .from("list_items")
      .select("*")
      .eq("list_id", list.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("list_item_catalog")
      .select("*")
      .eq("list_id", list.id)
      .order("use_count", { ascending: false })
      .order("last_used_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <ShoppingListView
      list={list}
      initialItems={items ?? []}
      initialCatalog={catalog ?? []}
      isOwner={list.owner_id === user.id}
    />
  );
}
