import Link from "next/link";
import RecipeForm from "@/components/RecipeForm";
import type { RecipeKind } from "@/lib/types";

export default function NewRecipePage({ kind }: { kind: RecipeKind }) {
  const isCocktail = kind === "cocktail";
  const cancelHref = isCocktail ? "/recipes/cocktails" : "/recipes";

  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="font-script text-3xl font-bold text-gray-900">
            {isCocktail ? "New Cocktail" : "New Recipe"}
          </h1>
          <Link href={cancelHref} className="text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
        </div>
        <div className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <RecipeForm kind={kind} />
        </div>
      </div>
    </div>
  );
}
