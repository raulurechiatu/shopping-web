import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateOrJoinList from "@/components/CreateOrJoinList";
import SignOutButton from "@/components/SignOutButton";
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
          <SignOutButton className="text-xs text-gray-500 hover:text-gray-700" />
        </div>

        {lists.length > 0 && (
          <div className="w-full space-y-2">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3.5 shadow-sm hover:bg-gray-50"
              >
                <span className="font-hand text-lg text-gray-900">{list.name}</span>
                <span className="text-xs text-gray-400">code {list.invite_code}</span>
              </Link>
            ))}
          </div>
        )}

        <CreateOrJoinList />
      </div>
    </div>
  );
}
