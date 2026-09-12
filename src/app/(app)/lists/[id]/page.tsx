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

  const { data: membership } = user.is_anonymous
    ? { data: null } // guests don't get the household pantry/favorites feature
    : await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();

  const [{ data: items }, { data: favorites }, { data: ownerProfile }, { data: listMembers }, { data: householdMembers }] =
    await Promise.all([
      supabase
        .from("list_items")
        .select("*")
        .eq("list_id", list.id)
        .order("created_at", { ascending: true }),
      membership
        ? supabase
            .from("household_items")
            .select("*")
            .eq("household_id", membership.household_id)
            .eq("is_favorite", true)
            .order("name", { ascending: true })
        : Promise.resolve({ data: [] }),
      isOwner
        ? Promise.resolve({ data: null })
        : supabase.from("profiles").select("full_name").eq("id", list.owner_id).maybeSingle(),
      supabase.from("list_members").select("user_id").eq("list_id", list.id),
      membership
        ? supabase.from("household_members").select("user_id").eq("household_id", membership.household_id)
        : Promise.resolve({ data: [] }),
    ]);

  const listMemberIds = new Set((listMembers ?? []).map((m) => m.user_id));
  const householdMemberIds = (householdMembers ?? []).map((m) => m.user_id);
  const sharedWithHousehold =
    householdMemberIds.length > 1 && householdMemberIds.every((id) => listMemberIds.has(id));

  return (
    <ShoppingListView
      list={list}
      initialItems={items ?? []}
      initialFavorites={favorites ?? []}
      householdId={membership?.household_id ?? null}
      isOwner={isOwner}
      ownerName={ownerProfile?.full_name ?? null}
      sharedWithHousehold={sharedWithHousehold}
    />
  );
}
