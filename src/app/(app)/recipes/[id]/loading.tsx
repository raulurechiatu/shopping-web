import Skeleton from "@/components/Skeleton";

export default function RecipeDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] px-0 py-0 sm:px-6 sm:py-10 dark:bg-[#14171c]">
      <div className="mx-auto min-h-screen w-full max-w-2xl bg-white p-5 pt-6 shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl dark:bg-gray-900">
        <Skeleton className="mb-4 h-4 w-16" />
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-6 h-8 w-64 rounded-full" />
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full rounded-full" />
          <Skeleton className="h-8 w-full rounded-full" />
          <Skeleton className="h-8 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
