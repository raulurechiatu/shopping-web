"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShareModal from "@/components/ShareModal";
import { getTitleIcon } from "@/lib/itemIcons";
import type { Recipe } from "@/lib/types";

export default function RecipeRow({ recipe, isShared }: { recipe: Recipe; isShared: boolean }) {
  const router = useRouter();
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const isCocktail = recipe.kind === "cocktail";
  const noun = isCocktail ? "cocktail" : "recipe";
  const titleIcon = getTitleIcon(recipe.name, isCocktail ? "🍸" : "🍽️");

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.name}"? This can't be undone.`)) return;
    setDeleting(true);
    // Hide the row immediately rather than waiting on the network round
    // trip — router.refresh() would re-fetch the whole list from the
    // server before anything visually changed.
    setRemoved(true);
    const supabase = createClient();
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) {
      alert(error.message);
      setRemoved(false);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  if (removed) return null;

  return (
    <li className="flex items-center gap-2 rounded-xl bg-white dark:bg-gray-900 px-4 py-3.5 shadow-sm">
      <Link href={`/recipes/${recipe.id}`} className="min-w-0 flex-1">
        <span className="font-hand block truncate text-lg text-gray-900 dark:text-gray-100">
          <span className="mr-1">{titleIcon}</span>
          {recipe.name}
        </span>
      </Link>
      {isShared && (
        <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-500 dark:text-gray-400 uppercase">
          Shared
        </span>
      )}
      {!isShared && (
        <>
          <button
            onClick={() => setShowShare(true)}
            className="flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M15 8a3 3 0 10-2.83-4H12a3 3 0 000 6h.17A3 3 0 0015 8zM5 10a3 3 0 100 6 3 3 0 000-6zm10 2a3 3 0 100 6 3 3 0 000-6z" />
              <path d="M7.5 12.5l5-3M7.5 13.5l5 3" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Share
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label={`Delete ${noun}`}
            className="shrink-0 touch-manipulation rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M8.75 1a.75.75 0 00-.75.75V2H4.25a.75.75 0 000 1.5h.312l.61 11.24A2 2 0 007.166 16.5h5.668a2 2 0 001.994-1.76l.61-11.24h.312a.75.75 0 000-1.5H12v-.25a.75.75 0 00-.75-.75h-2.5zM7.5 6.25a.75.75 0 011.5 0v6.5a.75.75 0 01-1.5 0v-6.5zm4.25-.75a.75.75 0 00-.75.75v6.5a.75.75 0 001.5 0v-6.5a.75.75 0 00-.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </>
      )}

      {showShare && (
        <ShareModal
          title={`Share "${recipe.name}"`}
          description={`Share a link or code so others can view this ${noun} (read-only).`}
          code={recipe.invite_code}
          joinPath={`/recipes/join/${recipe.invite_code}`}
          mailSubject={`Check out my ${noun} "${recipe.name}"`}
          shareText={(joinUrl) =>
            `Check out my ${noun} "${recipe.name}".\n\nOpen this link to view it: ${joinUrl}\n\nOr enter this code in the app: ${recipe.invite_code}`
          }
          onClose={() => setShowShare(false)}
        />
      )}
    </li>
  );
}
