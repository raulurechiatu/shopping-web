"use client";

import { useState } from "react";

export default function InviteModal({
  listName,
  inviteCode,
  onClose,
}: {
  listName: string;
  inviteCode: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode}` : "";

  const messageBody = `Join my shopping list "${listName}" so we can shop together.\n\nOpen this link to join instantly: ${joinUrl}\n\nOr enter this invite code in the app: ${inviteCode}`;

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); ignore.
    }
  }

  async function shareCode() {
    try {
      await navigator.share({
        title: "Join my shopping list",
        text: messageBody,
      });
    } catch {
      // User cancelled the share sheet or it's unsupported; ignore.
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    `Join my shopping list "${listName}"`,
  )}&body=${encodeURIComponent(messageBody)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#fffdf6] p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-2xl text-gray-900">Invite to &quot;{listName}&quot;</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share a link or code so others can join your list.
        </p>

        <div className="mx-auto mt-5 w-fit rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-4">
          <span className="font-mono text-4xl font-bold tracking-[0.25em] text-gray-900">
            {inviteCode}
          </span>
        </div>

        <button
          onClick={() => copy(joinUrl, "link")}
          className="mt-3 flex w-full touch-manipulation items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left"
        >
          <span className="flex-1 truncate text-xs text-gray-500">{joinUrl}</span>
          <span className="shrink-0 text-xs font-medium text-gray-700">
            {copied === "link" ? "Copied!" : "Copy link"}
          </span>
        </button>

        <div className="mt-5 flex flex-col gap-2">
          {canShare && (
            <button
              onClick={shareCode}
              className="touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42]"
            >
              Share...
            </button>
          )}
          <a
            href={mailtoHref}
            className="touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Email invite
          </a>
          <button
            onClick={() => copy(inviteCode, "code")}
            className="touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied === "code" ? "Copied!" : "Copy code"}
          </button>
          <button
            onClick={onClose}
            className="touch-manipulation px-4 py-2 text-sm text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
