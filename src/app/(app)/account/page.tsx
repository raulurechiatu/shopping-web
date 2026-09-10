import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware redirects to /login
  }

  const isGuest = user.is_anonymous;

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <h1 className="font-script text-3xl font-bold text-gray-900">Account</h1>

        <div className="w-full rounded-2xl bg-white p-6 text-center shadow-sm">
          {isGuest ? (
            <>
              <p className="font-hand text-xl text-gray-900">You&apos;re browsing as a guest</p>
              <p className="mt-1 text-sm text-gray-500">
                Your lists are only saved to this device. Sign in with email or Google to keep
                access from anywhere.
              </p>
            </>
          ) : (
            <>
              <p className="font-hand text-xl text-gray-900">{user.email}</p>
              <p className="mt-1 text-sm text-gray-500">Signed in</p>
            </>
          )}

          <div className="mt-5">
            <SignOutButton className="w-full touch-manipulation rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
