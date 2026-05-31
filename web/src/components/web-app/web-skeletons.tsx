/** Premium glass loading skeletons for the native PulseVerse Web surfaces. */

const shimmer = "animate-pulse rounded bg-white/8";

export function WebProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-[-48px] h-32 rounded-3xl border border-white/8 bg-white/5 sm:h-40" />
      <div className="relative rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="-mt-16 sm:-mt-20">
            <div className="size-24 animate-pulse rounded-full border-[3px] border-white/10 bg-white/8 sm:size-28" />
          </div>
          <div className="flex-1 space-y-2">
            <div className={`h-6 w-48 ${shimmer}`} />
            <div className={`h-4 w-28 ${shimmer}`} />
          </div>
        </div>
        <div className="mt-5 flex gap-7 border-t border-white/8 pt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className={`h-5 w-10 ${shimmer}`} />
              <div className={`h-3 w-14 ${shimmer}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl border border-white/8 bg-white/6" />
        ))}
      </div>
    </div>
  );
}

export function WebCirclesIndexSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 space-y-2">
        <div className={`h-7 w-32 ${shimmer}`} />
        <div className={`h-4 w-64 ${shimmer}`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-4">
            <div className="flex items-center gap-3">
              <div className="size-12 animate-pulse rounded-2xl bg-white/8" />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-32 ${shimmer}`} />
                <div className={`h-3 w-20 ${shimmer}`} />
              </div>
            </div>
            <div className={`mt-3 h-3.5 w-full ${shimmer}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebCircleDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-8">
      <div className={`mb-4 h-4 w-24 ${shimmer}`} />
      <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="size-14 animate-pulse rounded-2xl bg-white/8" />
          <div className="flex-1 space-y-2">
            <div className={`h-6 w-44 ${shimmer}`} />
            <div className={`h-4 w-32 ${shimmer}`} />
          </div>
        </div>
        <div className={`mt-4 h-4 w-full ${shimmer}`} />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-4">
            <div className="flex items-center gap-2.5">
              <div className="size-7 animate-pulse rounded-full bg-white/8" />
              <div className={`h-3.5 w-28 ${shimmer}`} />
            </div>
            <div className={`mt-3 h-4 w-3/4 ${shimmer}`} />
            <div className={`mt-2 h-3.5 w-full ${shimmer}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebCircleThreadSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
      <div className={`mb-4 h-4 w-28 ${shimmer}`} />
      <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="size-8 animate-pulse rounded-full bg-white/8" />
          <div className={`h-3.5 w-32 ${shimmer}`} />
        </div>
        <div className={`mt-3 h-6 w-2/3 ${shimmer}`} />
        <div className={`mt-2 h-4 w-full ${shimmer}`} />
        <div className={`mt-2 h-4 w-5/6 ${shimmer}`} />
      </div>
      <div className="mt-6 flex flex-col gap-2.5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 animate-pulse rounded-full bg-white/8" />
              <div className={`h-3.5 w-24 ${shimmer}`} />
            </div>
            <div className={`mt-2 h-3.5 w-full ${shimmer}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebNotificationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
      <div className={`h-7 w-40 ${shimmer}`} />
      <div className={`mt-2 h-4 w-64 ${shimmer}`} />
      <div className="mt-6 flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[rgba(12,18,32,0.55)] px-4 py-3">
            <div className="size-11 animate-pulse rounded-full bg-white/8" />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-5/6 ${shimmer}`} />
              <div className={`h-3 w-20 ${shimmer}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebShopSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6 sm:py-8">
      <div className={`h-7 w-44 ${shimmer}`} />
      <div className={`mt-2 h-4 w-64 ${shimmer}`} />
      <div className={`mb-3 mt-7 h-4 w-28 ${shimmer}`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-[rgba(12,18,32,0.6)] p-5">
            <div className="size-20 animate-pulse rounded-full bg-white/8" />
            <div className={`h-4 w-20 ${shimmer}`} />
            <div className={`h-8 w-full ${shimmer}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebLiveSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6 sm:py-8">
      <div className={`h-7 w-32 ${shimmer}`} />
      <div className={`mt-2 h-4 w-64 ${shimmer}`} />
      <div className={`mb-3 mt-7 h-4 w-24 ${shimmer}`} />
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-white/8 bg-[rgba(12,18,32,0.6)]">
            <div className="aspect-video w-full animate-pulse bg-white/6" />
            <div className="space-y-2 p-4">
              <div className={`h-3.5 w-28 ${shimmer}`} />
              <div className={`h-4 w-5/6 ${shimmer}`} />
              <div className={`mt-2 h-8 w-full ${shimmer}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
