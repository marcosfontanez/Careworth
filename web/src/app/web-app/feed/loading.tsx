export default function WebAppFeedLoading() {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-white/8" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-white/6" />
      </div>
      <div className="mb-6 flex gap-2">
        <div className="h-8 w-24 animate-pulse rounded-full bg-white/8" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-white/6" />
      </div>
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)]"
          >
            <div className="flex items-center gap-3 p-4">
              <div className="size-9 animate-pulse rounded-full bg-white/8" />
              <div className="space-y-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-white/8" />
                <div className="h-3 w-20 animate-pulse rounded bg-white/6" />
              </div>
            </div>
            <div className="aspect-video w-full animate-pulse bg-white/6" />
            <div className="flex gap-4 p-4">
              <div className="h-4 w-12 animate-pulse rounded bg-white/8" />
              <div className="h-4 w-12 animate-pulse rounded bg-white/8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
