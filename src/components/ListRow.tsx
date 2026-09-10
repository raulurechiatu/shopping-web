"use client";

import { useState } from "react";
import Link from "next/link";
import ShareModal from "@/components/ShareModal";
import type { ShoppingList } from "@/lib/types";

export default function ListRow({ list }: { list: ShoppingList }) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <li className="flex items-center gap-2 rounded-xl bg-white px-4 py-3.5 shadow-sm">
      <Link href={`/lists/${list.id}`} className="min-w-0 flex-1">
        <span className="font-hand block truncate text-lg text-gray-900">{list.name}</span>
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
