import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManageItemsView from "@/components/ManageItemsView";

export default async function ManageItemsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: catalog } = await supabase
    .from("list_item_catalog")
    .select("*")
    .eq("list_id", list.id)
    .order("name", { ascending: true });

  return <ManageItemsView list={list} initialCatalog={catalog ?? []} />;
}
