import Skeleton from "@/components/Skeleton";

export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-10 dark:bg-[#14171c]">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <Skeleton className="h-9 w-32 self-start" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
