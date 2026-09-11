import { createClient } from "@/lib/supabase/server";
import ManageItemsView from "@/components/ManageItemsView";
import type { ShoppingList } from "@/lib/types";

export default async function ItemsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: memberships } = await supabase
    .from("list_members")
    .select("list_id, lists(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const lists = (memberships ?? [])
    .map((m) => m.lists as unknown as ShoppingList)
    .filter(Boolean);

  const listIds = lists.map((l) => l.id);

  const { data: catalog } = listIds.length
    ? await supabase
        .from("list_item_catalog")
        .select("*")
        .in("list_id", listIds)
        .order("name", { ascending: true })
    : { data: [] };

  return <ManageItemsView lists={lists} initialCatalog={catalog ?? []} />;
}
