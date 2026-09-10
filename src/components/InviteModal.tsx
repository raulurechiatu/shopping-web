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
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); ignore.
    }
  }

  async function shareCode() {
    try {
      await navigator.share({
        title: "Join my shopping list",
        text: `Join my shopping list "${listName}" — use invite code ${inviteCode} in the app.`,
      });
    } catch {
      // User cancelled the share sheet or it's unsupported; ignore.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#fffdf7] p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-2xl text-gray-900">Invite to &quot;{listName}&quot;</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share this code so others can join your list.
        </p>

        <div className="mx-auto mt-5 w-fit rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-4">
          <span className="font-mono text-4xl font-bold tracking-[0.25em] text-gray-900">
            {inviteCode}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {canShare && (
            <button
              onClick={shareCode}
              className="touch-manipulation rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Share
            </button>
          )}
          <button
            onClick={copyCode}
            className="touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy code"}
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
