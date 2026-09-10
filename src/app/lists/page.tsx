import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateOrJoinList from "@/components/CreateOrJoinList";
import SignOutButton from "@/components/SignOutButton";
import ListRow from "@/components/ListRow";
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

  return (
    <div className="min-h-screen bg-[#d8d3c8] px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="font-script text-3xl font-bold text-gray-900">Your Lists</h1>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/recipes" className="text-gray-500 hover:text-gray-700">
              Recipes
            </Link>
            <SignOutButton className="text-gray-500 hover:text-gray-700" />
          </div>
        </div>

        {lists.length > 0 && (
          <ul className="w-full space-y-2">
            {lists.map((list) => (
              <ListRow key={list.id} list={list} />
            ))}
          </ul>
        )}

        <CreateOrJoinList />
      </div>
    </div>
  );
}
