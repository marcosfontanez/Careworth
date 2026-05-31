export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-white/8" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <div className="aspect-video w-full animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
          <div className="mt-5 h-7 w-3/4 animate-pulse rounded bg-white/8" />
          <div className="mt-4 h-9 w-40 animate-pulse rounded-full bg-white/8" />
          <div className="mt-6 h-12 w-48 animate-pulse rounded-full bg-white/8" />
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </div>
  );
}
