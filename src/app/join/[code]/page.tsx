import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?join=${encodeURIComponent(code)}`);
  }

  const { data, error } = await supabase.rpc("join_list_by_code", { code });

  if (error || !data) {
    redirect(`/lists?joinError=${encodeURIComponent(code)}`);
  }

  redirect(`/lists/${data.id}`);
}
