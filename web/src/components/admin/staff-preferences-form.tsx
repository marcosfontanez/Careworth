"use client";

import { useActionState } from "react";

import { updateStaffPreferences, type StaffPreferencesState } from "@/app/(admin)/admin/staff-preferences-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const initialState: StaffPreferencesState = {};

export function StaffPreferencesForm({
  preferredLocale,
  productDigestEmail,
}: {
  preferredLocale: Locale;
  productDigestEmail: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateStaffPreferences, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          Preferences saved.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="preferred_locale">Preferred language</Label>
        <p className="text-xs text-muted-foreground">
          Stored on your profile for email and marketing copy where translated (home, nav, footer, download, contact,
          etc.). Additional pages stay English until localized.
        </p>
        <select
          id="preferred_locale"
          name="preferred_locale"
          defaultValue={preferredLocale}
          className={cn(
            "flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="product_digest_email"
          name="product_digest_email"
          type="checkbox"
          value="on"
          defaultChecked={productDigestEmail}
          className="mt-1 h-4 w-4 rounded border-input accent-primary"
        />
        <div className="space-y-1">
          <Label htmlFor="product_digest_email" className="font-medium leading-none">
            Product digest email
          </Label>
          <p className="text-xs text-muted-foreground">
            Opt in to occasional product updates and rollout notices. Does not change transactional or legal mail.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
