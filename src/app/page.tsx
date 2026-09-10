import { createClient } from "@/lib/supabase/server";
import CreateOrJoinList from "@/components/CreateOrJoinList";
import ShoppingListView from "@/components/ShoppingListView";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: membership } = await supabase
    .from("list_members")
    .select("list_id, lists(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const list = membership?.lists as unknown as
    | { id: string; name: string; invite_code: string; owner_id: string; created_at: string }
    | undefined;

  if (!list) {
    return <CreateOrJoinList />;
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

  return <ShoppingListView list={list} initialItems={items ?? []} initialCatalog={catalog ?? []} />;
}
