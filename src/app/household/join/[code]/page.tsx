"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";

type Preview = { household_id: string; household_name: string; owner_name: string | null; owner_avatar_url: string | null };

export default function JoinHouseholdPage({ params }: { params: Promise<{ code: string }> }) {
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

      if (!user || user.is_anonymous) {
        router.replace(`/login?household=${encodeURIComponent(code)}`);
        return;
      }

      const { data, error } = await supabase.rpc("get_household_invite_preview", { code });
      const row = data?.[0];
      if (error || !row || !row.household_id) {
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
    const { data, error } = await supabase.rpc("join_household_by_code", { code });
    if (error || !data) {
      setError(error?.message ?? "Couldn't join this household.");
      setJoining(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] px-4 dark:bg-[#14171c]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
        {preview === null && <p className="text-sm text-gray-500 dark:text-gray-400">Loading invite...</p>}

        {preview === "not-found" && (
          <>
            <p className="font-hand text-xl text-gray-900 dark:text-gray-100">Invite not found</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This invite code doesn&apos;t match a household, or it may have been deleted.
            </p>
          </>
        )}

        {preview && preview !== "not-found" && (
          <>
            <p className="mb-4 text-5xl">🏠</p>
            <h1 className="font-script text-2xl font-bold text-gray-900 dark:text-gray-100">
              {preview.household_name}
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <UserAvatar
                user={{
                  id: preview.household_id,
                  email: null,
                  fullName: preview.owner_name,
                  avatarUrl: preview.owner_avatar_url,
                  isAnonymous: false,
                }}
                size={24}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Invited by{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">{preview.owner_name ?? "someone"}</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              You&apos;ll share pantry items and recipes with everyone in this household.
            </p>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-6 w-full touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
            >
              {joining ? "Joining..." : "🏠 Join household"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
