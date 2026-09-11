import Skeleton from "@/components/Skeleton";

export default function ListsLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <Skeleton className="h-9 w-40 self-start" />
        <div className="w-full space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
