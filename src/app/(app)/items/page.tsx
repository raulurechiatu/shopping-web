import { createClient } from "@/lib/supabase/server";
import ManageItemsView from "@/components/ManageItemsView";
import type { HouseholdItem } from "@/lib/types";

export default async function ItemsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let pantryItems: HouseholdItem[] = [];
  let memberNames: Record<string, string> = {};

  if (membership) {
    const [{ data: items }, { data: memberRows }] = await Promise.all([
      supabase
        .from("household_items")
        .select("*")
        .eq("household_id", membership.household_id)
        .order("name", { ascending: true }),
      supabase.from("household_members").select("user_id").eq("household_id", membership.household_id),
    ]);
    pantryItems = items ?? [];

    const memberIds = (memberRows ?? []).map((m) => m.user_id);
    const { data: profiles } = memberIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
      : { data: [] };
    memberNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? "Household member"]));
  }

  return (
    <ManageItemsView
      initialPantryItems={pantryItems}
      householdId={membership?.household_id ?? null}
      memberNames={memberNames}
      currentUserId={user.id}
    />
  );
}
