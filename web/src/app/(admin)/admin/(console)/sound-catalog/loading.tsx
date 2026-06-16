import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSoundCatalogLoading() {
  return (
    <div className="space-y-6 pb-10">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
