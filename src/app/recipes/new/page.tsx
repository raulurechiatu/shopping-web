import Link from "next/link";
import RecipeForm from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div className="min-h-screen bg-[#d8d3c8] px-4 py-10">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="font-script text-3xl font-bold text-gray-900">New Recipe</h1>
          <Link href="/recipes" className="text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
        </div>
        <div className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <RecipeForm />
        </div>
      </div>
    </div>
  );
}
