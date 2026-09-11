"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShareModal from "@/components/ShareModal";
import { getItemIcon } from "@/lib/itemIcons";
import type { ShoppingList } from "@/lib/types";

export default function ListRow({ list, isOwner }: { list: ShoppingList; isOwner: boolean }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${list.name}"? This removes it for everyone and can't be undone.`)) {
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lists").delete().eq("id", list.id);
    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex items-center gap-2 rounded-xl bg-white px-4 py-3.5 shadow-sm">
      <Link href={`/lists/${list.id}`} className="min-w-0 flex-1">
        <span className="font-hand block truncate text-lg text-gray-900">
          <span className="mr-1">{getItemIcon(list.name)}</span>
          {list.name}
        </span>
      </Link>
      <button
        onClick={() => setShowInvite(true)}
        className="flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M15 8a3 3 0 10-2.83-4H12a3 3 0 000 6h.17A3 3 0 0015 8zM5 10a3 3 0 100 6 3 3 0 000-6zm10 2a3 3 0 100 6 3 3 0 000-6z" />
          <path d="M7.5 12.5l5-3M7.5 13.5l5 3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        Invite
      </button>
      {isOwner && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete list"
          className="shrink-0 touch-manipulation rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-500"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M8.75 1a.75.75 0 00-.75.75V2H4.25a.75.75 0 000 1.5h.312l.61 11.24A2 2 0 007.166 16.5h5.668a2 2 0 001.994-1.76l.61-11.24h.312a.75.75 0 000-1.5H12v-.25a.75.75 0 00-.75-.75h-2.5zM7.5 6.25a.75.75 0 011.5 0v6.5a.75.75 0 01-1.5 0v-6.5zm4.25-.75a.75.75 0 00-.75.75v6.5a.75.75 0 001.5 0v-6.5a.75.75 0 00-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {showInvite && (
        <ShareModal
          title={`Invite to "${list.name}"`}
          description="Share a link or code so others can join your list."
          code={list.invite_code}
          joinPath={`/join/${list.invite_code}`}
          mailSubject={`Join my shopping list "${list.name}"`}
          shareText={(joinUrl) =>
            `Join my shopping list "${list.name}" so we can shop together.\n\nOpen this link to join instantly: ${joinUrl}\n\nOr enter this invite code in the app: ${list.invite_code}`
          }
          onClose={() => setShowInvite(false)}
        />
      )}
    </li>
  );
}
