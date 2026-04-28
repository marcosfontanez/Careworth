export function StatHighlight({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 px-6 py-5 text-center">
      <p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{value}</p>
      <p className="mt-1 font-medium text-foreground">{label}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
