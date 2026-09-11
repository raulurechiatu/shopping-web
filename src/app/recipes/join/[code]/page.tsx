"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTitleIcon } from "@/lib/itemIcons";
import UserAvatar from "@/components/UserAvatar";

type Preview = {
  recipe_id: string;
  recipe_name: string;
  recipe_kind: "food" | "cocktail";
  owner_name: string | null;
  owner_avatar_url: string | null;
};

export default function JoinRecipePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | "not-found" | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/login?recipe=${encodeURIComponent(code)}`);
        return;
      }

      const { data, error } = await supabase.rpc("get_recipe_invite_preview", { code });
      const row = data?.[0];
      if (error || !row || !row.recipe_id) {
        setPreview("not-found");
        return;
      }
      setPreview(row as Preview);
    })();
  }, [code, router]);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_recipe_by_code", { code });
    if (error || !data) {
      setError(error?.message ?? "Couldn't open this recipe.");
      setJoining(false);
      return;
    }
    router.push(`/recipes/${data.id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] px-4 dark:bg-[#14171c]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
        {preview === null && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading invite...</p>
        )}

        {preview === "not-found" && (
          <>
            <p className="font-hand text-xl text-gray-900 dark:text-gray-100">Invite not found</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This invite code doesn't match a recipe, or it may have been deleted.
            </p>
          </>
        )}

        {preview && preview !== "not-found" && (
          <>
            <p className="mb-4 text-5xl">
              {getTitleIcon(preview.recipe_name, preview.recipe_kind === "cocktail" ? "🍸" : "🍽️")}
            </p>
            <h1 className="font-script text-2xl font-bold text-gray-900 dark:text-gray-100">
              {preview.recipe_name}
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <UserAvatar
                user={{
                  id: preview.recipe_id,
                  email: null,
                  fullName: preview.owner_name,
                  avatarUrl: preview.owner_avatar_url,
                  isAnonymous: false,
                }}
                size={24}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Shared by <span className="font-medium text-gray-700 dark:text-gray-300">{preview.owner_name ?? "someone"}</span>
              </p>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-6 w-full touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
            >
              {joining ? "Opening..." : "👀 View recipe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
