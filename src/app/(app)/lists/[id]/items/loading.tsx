import Skeleton from "@/components/Skeleton";

export default function ManageItemsLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] px-0 py-0 sm:px-6 sm:py-10 dark:bg-[#14171c]">
      <div className="mx-auto min-h-screen w-full max-w-2xl bg-white p-5 pt-6 shadow-none sm:min-h-0 sm:rounded-lg sm:shadow-xl dark:bg-gray-900">
        <Skeleton className="mb-4 h-4 w-16" />
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
