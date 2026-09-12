import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import UserAvatar from "@/components/UserAvatar";
import ThemeToggle from "@/components/ThemeToggle";
import UnitsPreference from "@/components/UnitsPreference";
import HouseholdSection from "@/components/HouseholdSection";
import type { CurrentUser } from "@/lib/useCurrentUser";
import type { UnitSystem } from "@/lib/unitConversion";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const isGuest = !!user.is_anonymous;
  const { data: profile } = isGuest
    ? { data: null }
    : await supabase.from("profiles").select("preferred_units").eq("id", user.id).maybeSingle();
  const preferredUnits = (profile?.preferred_units as UnitSystem | null) ?? null;

  const { data: membership } = isGuest
    ? { data: null }
    : await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();

  const [{ data: household }, { data: memberRows }] = membership
    ? await Promise.all([
        supabase.from("households").select("*").eq("id", membership.household_id).maybeSingle(),
        supabase.from("household_members").select("user_id").eq("household_id", membership.household_id),
      ])
    : [{ data: null }, { data: null }];

  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: memberProfiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] };
  const members = memberIds.map((id) => ({
    id,
    full_name: memberProfiles?.find((p) => p.id === id)?.full_name ?? null,
  }));

  const metadata = user.user_metadata ?? {};
  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email ?? null,
    fullName: (metadata.full_name as string) || (metadata.name as string) || null,
    avatarUrl: (metadata.avatar_url as string) || (metadata.picture as string) || null,
    isAnonymous: isGuest,
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <h1 className="font-script text-3xl font-bold text-gray-900 dark:text-gray-100">
          Account
        </h1>

        <div className="w-full rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-gray-900">
          <div className="mb-4 flex justify-center">
            <UserAvatar user={currentUser} size={72} />
          </div>

          {isGuest ? (
            <>
              <p className="font-hand text-xl text-gray-900 dark:text-gray-100">
                You&apos;re browsing as a guest
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your lists are only saved to this device. Sign in with email or Google to keep
                access from anywhere.
              </p>
            </>
          ) : (
            <>
              <p className="font-hand text-xl text-gray-900 dark:text-gray-100">
                {currentUser.fullName ?? user.email}
              </p>
              {currentUser.fullName && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Signed in</p>
            </>
          )}

          <div className="mt-5">
            <SignOutButton className="w-full touch-manipulation rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" />
          </div>
        </div>

        <div className="w-full rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <p className="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            Appearance
          </p>
          <ThemeToggle />
        </div>

        {!isGuest && (
          <div className="w-full rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Units
            </p>
            <UnitsPreference initialUnits={preferredUnits} />
          </div>
        )}

        {!isGuest && (
          <div className="w-full rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Household
            </p>
            <HouseholdSection household={household} members={members} currentUserId={user.id} />
          </div>
        )}
      </div>
    </div>
  );
}
