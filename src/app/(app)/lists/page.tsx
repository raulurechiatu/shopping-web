import { createClient } from "@/lib/supabase/server";
import CreateOrJoinList from "@/components/CreateOrJoinList";
import ListsGrid from "@/components/ListsGrid";
import type { ShoppingList } from "@/lib/types";

export default async function ListsPage() {
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

  // Pulled in alongside the lists themselves so the search box can match
  // against what's actually on each list, not just its title.
  const { data: items } = lists.length
    ? await supabase
        .from("list_items")
        .select("list_id, name, quantity, category")
        .in(
          "list_id",
          lists.map((l) => l.id),
        )
    : { data: [] };

  const itemsByListId = new Map<string, { name: string; quantity: string | null; category: string | null }[]>();
  for (const item of items ?? []) {
    if (!itemsByListId.has(item.list_id)) itemsByListId.set(item.list_id, []);
    itemsByListId.get(item.list_id)!.push(item);
  }

  // A list counts as "shared with household" once every current household
  // member (besides a solo household of just you) is also a list member.
  const { data: membership } = user.is_anonymous
    ? { data: null }
    : await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();

  let householdMemberIds: string[] = [];
  if (membership) {
    const { data: householdMemberRows } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", membership.household_id);
    householdMemberIds = (householdMemberRows ?? []).map((m) => m.user_id);
  }

  const { data: allListMembers } = lists.length
    ? await supabase
        .from("list_members")
        .select("list_id, user_id")
        .in(
          "list_id",
          lists.map((l) => l.id),
        )
    : { data: [] };

  const memberIdsByListId = new Map<string, Set<string>>();
  for (const row of allListMembers ?? []) {
    if (!memberIdsByListId.has(row.list_id)) memberIdsByListId.set(row.list_id, new Set());
    memberIdsByListId.get(row.list_id)!.add(row.user_id);
  }

  function isSharedWithHousehold(listId: string): boolean {
    if (householdMemberIds.length < 2) return false;
    const listMemberIds = memberIdsByListId.get(listId);
    if (!listMemberIds) return false;
    return householdMemberIds.every((id) => listMemberIds.has(id));
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-[#14171c] px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <h1 className="w-full font-script text-3xl font-bold text-gray-900 dark:text-gray-100">Your Lists</h1>

        <ListsGrid
          lists={lists.map((l) => ({
            ...l,
            items: itemsByListId.get(l.id) ?? [],
            sharedWithHousehold: isSharedWithHousehold(l.id),
          }))}
          currentUserId={user.id}
        />

        <CreateOrJoinList hasHousehold={!!membership} />
      </div>
    </div>
  );
}
