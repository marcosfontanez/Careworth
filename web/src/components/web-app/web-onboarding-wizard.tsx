"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  completeWebOnboardingAction,
  loadWebOnboardingCirclesAction,
  skipWebOnboardingAction,
  type WebOnboardingCircleOption,
} from "@/app/web-app/actions";
import {
  WEB_AUDIENCE_ROLE_OPTIONS,
  WEB_MEDICAL_SAFETY_CHECKBOX,
  WEB_MEDICAL_SAFETY_DISCLAIMER,
  WEB_ONBOARDING_INTEREST_MAX,
  WEB_ONBOARDING_INTEREST_OPTIONS,
  type WebAudienceRole,
  type WebContentInterest,
} from "@/lib/web-app/onboarding-constants";
import {
  blurbForWebOnboardingCircleSlug,
  labelForWebOnboardingCircleSlug,
  webIsHealthcareProfessionalPath,
  webNeedsMedicalSafetyStep,
} from "@/lib/web-app/onboarding-circle-suggestions";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/web-app/format";

type Step = "audience" | "interests" | "circles" | "profile" | "safety";
const STEPS: Step[] = ["audience", "interests", "circles", "profile", "safety"];

type Props = {
  initialDisplayName: string | null;
  initialUsername: string | null;
};

export function WebOnboardingWizard({ initialDisplayName, initialUsername }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("audience");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audienceRole, setAudienceRole] = useState<WebAudienceRole | null>(null);
  const [interests, setInterests] = useState<WebContentInterest[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [circleOptions, setCircleOptions] = useState<WebOnboardingCircleOption[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);

  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  const showProFields = webIsHealthcareProfessionalPath(audienceRole);
  const showSafetyStep = useMemo(
    () => webNeedsMedicalSafetyStep({ audienceRole, interests }),
    [audienceRole, interests],
  );
  const activeSteps = useMemo(
    () => (showSafetyStep ? STEPS : STEPS.filter((s) => s !== "safety")),
    [showSafetyStep],
  );
  const stepIndex = activeSteps.indexOf(step);
  const progress = activeSteps.length > 0 ? ((stepIndex + 1) / activeSteps.length) * 100 : 100;

  useEffect(() => {
    if (step !== "circles") return;
    let cancelled = false;
    setCirclesLoading(true);
    void loadWebOnboardingCirclesAction({ audienceRole, interests }).then((rows) => {
      if (!cancelled) {
        setCircleOptions(rows);
        setCirclesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [step, audienceRole, interests]);

  const toggleInterest = (key: WebContentInterest) => {
    setInterests((prev) => {
      if (prev.includes(key)) return prev.filter((i) => i !== key);
      if (prev.length >= WEB_ONBOARDING_INTEREST_MAX) return prev;
      return [...prev, key];
    });
  };

  const toggleCircle = (id: string) => {
    setSelectedCircleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const goNext = () => {
    const idx = activeSteps.indexOf(step);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1]!);
  };

  const goBack = () => {
    const idx = activeSteps.indexOf(step);
    if (idx > 0) setStep(activeSteps[idx - 1]!);
  };

  const finish = useCallback(async () => {
    if (showSafetyStep && !safetyAccepted) {
      setError("Please confirm the safety note to continue.");
      return;
    }
    if (!displayName.trim()) {
      setError("Add a display name so people know who you are.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const handle = username.replace(/^@+/, "").trim().toLowerCase();
    const result = await completeWebOnboardingAction({
      audienceRole,
      interests,
      circleIds: selectedCircleIds,
      displayName: displayName.trim(),
      username: handle || null,
      bio: bio.trim(),
      city: city.trim(),
      state: state.trim(),
      role: showProFields ? role : undefined,
      specialty: showProFields ? specialty : undefined,
      yearsExperience:
        showProFields && yearsExperience.trim()
          ? Math.max(0, parseInt(yearsExperience, 10) || 0)
          : undefined,
      medicalSafetyAcknowledged: showSafetyStep ? safetyAccepted : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError("Could not save onboarding. Try again in a moment.");
      return;
    }
    router.replace("/web-app/feed");
    router.refresh();
  }, [
    audienceRole,
    bio,
    city,
    displayName,
    interests,
    role,
    safetyAccepted,
    selectedCircleIds,
    showProFields,
    showSafetyStep,
    specialty,
    state,
    username,
    yearsExperience,
    router,
  ]);

  const skipAll = async () => {
    setSubmitting(true);
    setError(null);
    const result = await skipWebOnboardingAction();
    setSubmitting(false);
    if (!result.ok) {
      setError("Could not skip. Try again in a moment.");
      return;
    }
    router.replace("/web-app/feed");
    router.refresh();
  };

  const onPrimary = () => {
    if (step === activeSteps[activeSteps.length - 1]) {
      void finish();
      return;
    }
    goNext();
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#070b14] text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(6,182,212,0.18),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Welcome</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Set up your PulseVerse</h1>
          </div>
          <button
            type="button"
            onClick={() => void skipAll()}
            disabled={submitting}
            className="shrink-0 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex-1 space-y-4">
          {step === "audience" ? (
            <>
              <StepHeading
                title="What brings you to PulseVerse?"
                subtitle="Healthcare professionals are the heart of PulseVerse — and everyone curious about healthcare is welcome."
              />
              <div className="space-y-2">
                {WEB_AUDIENCE_ROLE_OPTIONS.map((opt) => {
                  const active = audienceRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAudienceRole(opt.value)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        active
                          ? "border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_24px_-8px_rgba(34,211,238,0.55)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20",
                      )}
                    >
                      <p className="font-semibold">{opt.label}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{opt.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "interests" ? (
            <>
              <StepHeading
                title="What do you want to see?"
                subtitle={`Pick up to ${WEB_ONBOARDING_INTEREST_MAX} topics — we use these to seed your For You feed.`}
              />
              <div className="flex flex-wrap gap-2">
                {WEB_ONBOARDING_INTEREST_OPTIONS.map((opt) => {
                  const active = interests.includes(opt.feedKey);
                  const disabled = !active && interests.length >= WEB_ONBOARDING_INTEREST_MAX;
                  return (
                    <button
                      key={opt.feedKey}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleInterest(opt.feedKey)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                        active
                          ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 disabled:opacity-40",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "circles" ? (
            <>
              <StepHeading
                title="Join starter Circles"
                subtitle="Public-safe rooms to explore — you can leave anytime."
              />
              {circlesLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" aria-hidden />
                </div>
              ) : (
                <div className="space-y-2">
                  {circleOptions.map((c) => {
                    const active = selectedCircleIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCircle(c.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-cyan-400/50 bg-cyan-500/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20",
                        )}
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-2xl">
                          {c.icon ?? "💬"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">
                            {labelForWebOnboardingCircleSlug(c.slug) || c.name}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {blurbForWebOnboardingCircleSlug(c.slug) || c.description}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {formatCount(c.memberCount)} members
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {step === "profile" ? (
            <>
              <StepHeading title="Your public profile" subtitle="How you show up on PulseVerse." />
              <Field label="Display name" value={displayName} onChange={setDisplayName} />
              <Field
                label="Username"
                value={username}
                onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                placeholder="lexi.rn"
              />
              <Field label="Bio" value={bio} onChange={setBio} multiline />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City" value={city} onChange={setCity} />
                <Field label="State" value={state} onChange={setState} />
              </div>
              {showProFields ? (
                <>
                  <Field label="Role" value={role} onChange={setRole} placeholder="RN, MD, CNA…" />
                  <Field label="Specialty" value={specialty} onChange={setSpecialty} />
                  <Field
                    label="Years of experience"
                    value={yearsExperience}
                    onChange={setYearsExperience}
                    inputMode="numeric"
                  />
                </>
              ) : null}
            </>
          ) : null}

          {step === "safety" ? (
            <>
              <StepHeading title="Community safety" subtitle="A quick note before you explore health topics." />
              <p className="rounded-2xl border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
                {WEB_MEDICAL_SAFETY_DISCLAIMER}
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <input
                  type="checkbox"
                  checked={safetyAccepted}
                  onChange={(e) => setSafetyAccepted(e.target.checked)}
                  className="mt-1 size-4 rounded border-white/20 bg-transparent accent-cyan-400"
                />
                <span className="text-sm leading-relaxed">{WEB_MEDICAL_SAFETY_CHECKBOX}</span>
              </label>
            </>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 text-sm font-medium text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-white/25 hover:text-foreground disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onPrimary}
            disabled={submitting || (step === "audience" && !audienceRole)}
            className="ml-auto inline-flex min-w-[120px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_-6px_rgba(34,211,238,0.65)] transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {step === activeSteps[activeSteps.length - 1] ? "Finish" : "Continue"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prefer the native app?{" "}
          <a href="https://pulseverse.app" className="font-semibold text-cyan-300/90 hover:text-cyan-200">
            Open PulseVerse on iOS or Android
          </a>
        </p>
      </div>
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-heading text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  inputMode?: "text" | "numeric";
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-cyan-400/40"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-cyan-400/40"
        />
      )}
    </label>
  );
}
