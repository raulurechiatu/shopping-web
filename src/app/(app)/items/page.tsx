import { createClient } from "@/lib/supabase/server";
import ManageItemsView from "@/components/ManageItemsView";

export default async function ItemsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: items } = await supabase
    .from("user_items")
    .select("*")
    .order("name", { ascending: true });

  return <ManageItemsView initialItems={items ?? []} />;
}
