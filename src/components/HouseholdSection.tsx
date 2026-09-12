"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDialog } from "@/lib/DialogProvider";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import ShareModal from "@/components/ShareModal";
import type { Household } from "@/lib/types";

type Member = { id: string; full_name: string | null };

export default function HouseholdSection({
  household,
  members,
  currentUserId,
}: {
  household: Household | null;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { confirmDialog, alertDialog } = useDialog();
  const requireOnline = useOnlineGuard();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const isOwner = household?.owner_id === currentUserId;

  async function leaveHousehold() {
    if (!household) return;
    const isSoleMember = members.length === 1;
    const ok = await confirmDialog(
      isSoleMember
        ? `Leave "${household.name}"? You'll lose access to its shared pantry and recipes.`
        : `Leave "${household.name}"? You'll lose access to its shared pantry and recipes — the rest of the household keeps them.`,
    );
    if (!ok) return;
    if (!(await requireOnline())) return;

    setBusyMemberId(currentUserId);
    const supabase = createClient();
    const { error } = await supabase.from("household_members").delete().eq("user_id", currentUserId);
    setBusyMemberId(null);
    if (error) {
      await alertDialog(error.message);
      return;
    }
    router.refresh();
  }

  async function removeMember(member: Member) {
    if (!household) return;
    const ok = await confirmDialog(
      `Remove ${member.full_name ?? "this person"} from "${household.name}"? They'll lose access to its shared pantry and recipes.`,
    );
    if (!ok) return;
    if (!(await requireOnline())) return;

    setBusyMemberId(member.id);
    const supabase = createClient();
    const { error } = await supabase.rpc("remove_household_member", { target_user_id: member.id });
    setBusyMemberId(null);
    if (error) {
      await alertDialog(error.message);
      return;
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!(await requireOnline())) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } =
      mode === "create"
        ? await supabase.rpc("create_household")
        : await supabase.rpc("join_household_by_code", { code: code.trim() });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function copyCode() {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // code is still visible on screen to copy by hand.
    }
  }

  if (household) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {members.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pr-2.5 pl-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2b3a55] text-[10px] font-medium text-white">
                {(m.full_name || "?").slice(0, 1).toUpperCase()}
              </span>
              {m.id === currentUserId ? "You" : (m.full_name ?? "Member")}
              {isOwner && m.id !== currentUserId && (
                <button
                  onClick={() => removeMember(m)}
                  disabled={busyMemberId === m.id}
                  aria-label={`Remove ${m.full_name ?? "member"}`}
                  className="touch-manipulation text-gray-400 hover:text-red-500 disabled:opacity-50 dark:text-gray-500"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="mb-1.5 text-xs text-gray-400 dark:text-gray-500">Invite code</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm tracking-wide text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {household.invite_code}
            </span>
            <button
              onClick={copyCode}
              className="shrink-0 touch-manipulation rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="mt-2 flex w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M15 8a3 3 0 10-2.83-4H12a3 3 0 000 6h.17A3 3 0 0015 8zM5 10a3 3 0 100 6 3 3 0 000-6zm10 2a3 3 0 100 6 3 3 0 000-6z" />
              <path d="M7.5 12.5l5-3M7.5 13.5l5 3" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Invite with QR code
          </button>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Anyone who joins shares your pantry and recipes.
          </p>
          <button
            onClick={leaveHousehold}
            disabled={busyMemberId === currentUserId}
            className="mt-3 touch-manipulation text-xs font-medium text-gray-400 hover:text-red-500 disabled:opacity-50 dark:text-gray-500"
          >
            Leave household
          </button>
        </div>

        {showInvite && (
          <ShareModal
            title={`Join ${household.name}`}
            description="Share a link, QR code, or invite code so someone can join your household."
            code={household.invite_code}
            joinPath={`/household/join/${household.invite_code}`}
            mailSubject={`Join my household "${household.name}"`}
            shareText={(joinUrl) =>
              `Join my household "${household.name}" so we can share a pantry and recipes.\n\nOpen this link to join instantly: ${joinUrl}\n\nOr enter this invite code in the app: ${household.invite_code}`
            }
            onClose={() => setShowInvite(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-2 rounded-lg bg-gray-100 p-1 text-sm font-medium dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-md py-2 ${
            mode === "create"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-md py-2 ${
            mode === "join"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Join
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {mode === "join" && (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--accent-food)] focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "create" ? "Create household" : "Join household"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Shares your pantry, favorites, and recipes with whoever joins — shopping lists stay separate
        unless you share one from its own Invite screen.
      </p>
    </div>
  );
}
