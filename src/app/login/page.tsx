"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams.get("join") ?? "";
  const recipeCode = searchParams.get("recipe") ?? "";
  const inviteCode = joinCode || recipeCode;
  const guestMode: "list" | "recipe" = recipeCode ? "recipe" : "list";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [showGuestForm, setShowGuestForm] = useState(!!inviteCode);
  const [guestCode, setGuestCode] = useState(inviteCode);
  const [guestStatus, setGuestStatus] = useState<"idle" | "joining" | "error">("idle");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<{ name: string; ownerName: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (inviteCode) {
      setShowGuestForm(true);
      setGuestCode(inviteCode);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (!inviteCode) return;
    const supabase = createClient();
    const rpcName = guestMode === "recipe" ? "get_recipe_invite_preview" : "get_list_invite_preview";
    supabase.rpc(rpcName, { code: inviteCode }).then(({ data }) => {
      const row = data?.[0];
      if (!row) return;
      setInvitePreview({
        name: guestMode === "recipe" ? row.recipe_name : row.list_name,
        ownerName: row.owner_name,
      });
    });
  }, [inviteCode, guestMode]);

  function callbackNext() {
    if (joinCode) return `/join/${encodeURIComponent(joinCode)}`;
    if (recipeCode) return `/recipes/join/${encodeURIComponent(recipeCode)}`;
    return "/";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackNext())}`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackNext())}`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    }
  }

  async function handleGuestJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = guestCode.trim();
    if (!code) return;

    setGuestStatus("joining");
    setGuestError(null);

    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setGuestError(
          anonError.message.toLowerCase().includes("anonymous")
            ? "Guest access isn't enabled yet."
            : anonError.message,
        );
        setGuestStatus("error");
        return;
      }
    }

    if (guestMode === "recipe") {
      const { data, error: joinError } = await supabase.rpc("join_recipe_by_code", { code });
      if (joinError) {
        setGuestError(
          joinError.message.includes("Invalid") ? "That code doesn't match a recipe." : joinError.message,
        );
        setGuestStatus("error");
        return;
      }
      router.push(`/recipes/${data.id}`);
      router.refresh();
      return;
    }

    const { data, error: joinError } = await supabase.rpc("join_list_by_code", { code });

    if (joinError) {
      setGuestError(joinError.message.includes("Invalid") ? "That invite code doesn't match a list." : joinError.message);
      setGuestStatus("error");
      return;
    }

    router.push(`/lists/${data.id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] dark:bg-[#14171c] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">Shopping List</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {joinCode &&
            (invitePreview ? (
              <>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {invitePreview.ownerName ?? "Someone"}
                </span>{" "}
                invited you to the list &ldquo;{invitePreview.name}&rdquo;. Sign in, or join below with
                no account needed.
              </>
            ) : (
              "You've been invited to a shopping list. Sign in, or join below with no account needed."
            ))}
          {recipeCode &&
            (invitePreview ? (
              <>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {invitePreview.ownerName ?? "Someone"}
                </span>{" "}
                shared the recipe &ldquo;{invitePreview.name}&rdquo; with you. Sign in, or view it below
                with no account needed.
              </>
            ) : (
              "You've been invited to view a recipe. Sign in, or view it below with no account needed."
            ))}
          {!joinCode &&
            !recipeCode &&
            "Sign in to keep your shopping list in sync with everyone in your household."}
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76z"
            />
            <path
              fill="#EA4335"
              d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.11c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          or
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        {status === "sent" ? (
          <p className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-sm text-green-700 dark:text-green-300">
            Check your inbox at <strong>{email}</strong> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm focus:border-[var(--accent-food)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "Send magic link"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          or
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        {!showGuestForm ? (
          <button
            type="button"
            onClick={() => setShowGuestForm(true)}
            className="w-full text-center text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-gray-100"
          >
            Have an invite code? Join without an account
          </button>
        ) : (
          <form onSubmit={handleGuestJoin} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Invite code"
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm focus:border-[var(--accent-food)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={guestStatus === "joining"}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {guestStatus === "joining"
                ? "Joining..."
                : guestMode === "recipe"
                  ? "View recipe as guest"
                  : "Join as guest"}
            </button>
            {guestError && <p className="text-sm text-red-600">{guestError}</p>}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              No email needed — you&apos;ll get access right away.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
