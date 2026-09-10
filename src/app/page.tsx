import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const { data: memberships } = await supabase
    .from("list_members")
    .select("list_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (memberships && memberships.length === 1) {
    redirect(`/lists/${memberships[0].list_id}`);
  }

  redirect("/lists");
}
