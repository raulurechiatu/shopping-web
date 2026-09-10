import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function JoinRecipePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?recipe=${encodeURIComponent(code)}`);
  }

  const { data, error } = await supabase.rpc("join_recipe_by_code", { code });

  if (error || !data) {
    redirect(`/recipes?joinError=${encodeURIComponent(code)}`);
  }

  redirect(`/recipes/${data.id}`);
}
