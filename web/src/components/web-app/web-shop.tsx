"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Crown, Gift, ShoppingBag, Sparkles } from "lucide-react";

import { equipBorderAction } from "@/app/web-app/actions";
import type { WebAppShopCopy } from "@/lib/marketing-copy/web-app";
import type { WebShopBorder, WebShopResult } from "@/lib/web-app/shop-data";

function BorderPreview({
  border,
  avatarUrl,
  displayName,
}: {
  border: WebShopBorder;
  avatarUrl: string | null;
  displayName: string;
}) {
  const ring = border.ringColor ?? "#2d7ff9";
  const glow = border.glowColor ?? ring;
  return (
    <span
      className="relative grid size-20 place-items-center rounded-full"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${glow}33, transparent 70%)`,
      }}
    >
      <span
        className="grid size-16 place-items-center rounded-full"
        style={{ boxShadow: `0 0 0 2.5px ${ring}, 0 0 18px -2px ${glow}` }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-[3.4rem] rounded-full object-cover" />
        ) : (
          <span className="grid size-[3.4rem] place-items-center rounded-full bg-gradient-to-br from-[#1a2440] to-[#0c1322] text-base font-bold text-foreground/70">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}

function BorderCard({
  border,
  avatarUrl,
  displayName,
  copy,
  busy,
  onEquip,
  onUnequip,
}: {
  border: WebShopBorder;
  avatarUrl: string | null;
  displayName: string;
  copy: WebAppShopCopy;
  busy: boolean;
  onEquip: (id: string) => void;
  onUnequip: () => void;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-3 rounded-3xl border p-5 text-center backdrop-blur-sm",
        border.equipped
          ? "border-primary/40 bg-gradient-to-br from-[rgba(20,32,58,0.85)] to-[rgba(12,18,32,0.82)] shadow-[0_0_30px_-12px_rgba(45,127,249,0.8)]"
          : "border-white/10 bg-[rgba(12,18,32,0.7)]",
      ].join(" ")}
    >
      <BorderPreview border={border} avatarUrl={avatarUrl} displayName={displayName} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{border.label}</p>
        {border.rarityTier ? (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">
            {border.rarityTier}
          </p>
        ) : border.subtitle ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{border.subtitle}</p>
        ) : null}
      </div>

      {border.equipped ? (
        <div className="flex w-full flex-col gap-1.5">
          <span className="inline-flex items-center justify-center gap-1 rounded-full bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
            <Check className="size-3.5" aria-hidden />
            {copy.equipped}
          </span>
          <button
            type="button"
            onClick={onUnequip}
            disabled={busy}
            className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-white/25 disabled:opacity-50"
          >
            {busy ? copy.equipping : copy.unequip}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onEquip(border.id)}
          disabled={busy}
          className="w-full rounded-full bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-bold text-white shadow-[0_0_24px_-10px_rgba(45,127,249,0.9)] transition enabled:hover:brightness-110 disabled:opacity-50"
        >
          {busy ? copy.equipping : copy.equip}
        </button>
      )}
    </div>
  );
}

export function WebShop({
  result,
  copy,
  purchaseHref,
  isExternalApp,
}: {
  result: WebShopResult;
  copy: WebAppShopCopy;
  purchaseHref: string;
  isExternalApp: boolean;
}) {
  const router = useRouter();
  const [borders, setBorders] = useState<WebShopBorder[]>(result.state === "ok" ? result.borders : []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();

  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  const avatarUrl = result.state === "ok" ? result.avatarUrl : null;
  const displayName = result.state === "ok" ? result.displayName : "";

  function applyEquip(frameId: string | null) {
    setError(false);
    setBusyId(frameId ?? "__unequip__");
    // Optimistic: reflect the new equipped state immediately.
    const prev = borders;
    setBorders((list) => list.map((b) => ({ ...b, equipped: frameId !== null && b.id === frameId })));
    startTransition(async () => {
      const res = await equipBorderAction(frameId);
      setBusyId(null);
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent("/web-app/shop")}`);
          return;
        }
        setBorders(prev); // rollback
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  if (result.state === "error") {
    return (
      <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        </header>
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center backdrop-blur-sm">
          <p className="text-sm font-bold text-foreground">{copy.errorTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.errorBody}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-white/25"
          >
            {copy.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      {/* Owned borders */}
      <section className="mb-7">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Crown className="size-4" aria-hidden />
          {copy.bordersTitle}
        </h2>
        {error ? <p className="mb-3 text-xs text-amber-300/90">{copy.equipError}</p> : null}
        {borders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center backdrop-blur-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--accent)]">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">{copy.noBordersTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.noBordersBody}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {borders.map((b) => (
              <BorderCard
                key={b.id}
                border={b}
                avatarUrl={avatarUrl}
                displayName={displayName}
                copy={copy}
                busy={busyId === b.id || (b.equipped && busyId === "__unequip__")}
                onEquip={(id) => applyEquip(id)}
                onUnequip={() => applyEquip(null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Purchase + monetization (app-managed) */}
      <section className="grid gap-3 md:grid-cols-2">
        <a
          href={purchaseHref}
          {...externalProps}
          className="group flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[rgba(18,26,44,0.92)] to-[rgba(12,18,32,0.82)] p-4 backdrop-blur-sm transition hover:border-white/20"
        >
          <div className="min-w-0">
            <div className="mb-1 inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--accent)]">
              <ShoppingBag className="size-4" aria-hidden />
            </div>
            <h3 className="text-sm font-bold text-foreground">{copy.purchaseTitle}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.purchaseBody}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-end rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition group-hover:border-white/25">
            {copy.purchaseCta}
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        </a>

        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.6)] p-4 backdrop-blur-sm">
          <div className="mb-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--accent)]">
            <Gift className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">{copy.monetizationTitle}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.monetizationBody}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
