"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { getContactFormErrors, getNewsletterFormErrors, parseFormLocale } from "@/lib/marketing-copy/forms";

export type MarketingFormState = { ok?: boolean; error?: string };

export async function submitContactForm(
  _prev: MarketingFormState,
  formData: FormData,
): Promise<MarketingFormState> {
  const locale = parseFormLocale(formData.get("locale"));
  const errs = getContactFormErrors(locale);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 64);
  const messageRaw = String(formData.get("message") ?? "").trim();
  const message = topic ? `[Inquiry: ${topic}]\n\n${messageRaw}` : messageRaw;
  const hp = String(formData.get("company_website") ?? "").trim();
  if (hp) {
    return { ok: true };
  }
  if (!name || !email || !message) {
    return { error: errs.required };
  }

  const h = await headers();
  const ip = getClientIpFromHeaders((n) => h.get(n));
  const rl = await checkRateLimitDistributed(`contact:${ip}`, 10, 3_600_000);
  if (!rl.ok) {
    return { error: errs.rateLimited };
  }

  let host: string | null = null;
  try {
    host = h.get("x-forwarded-host") ?? h.get("host");
  } catch {
    host = null;
  }

  try {
    const admin = createSupabaseServiceRoleClient();
    const { error } = await admin.from("marketing_contact_messages").insert({
      name,
      email,
      message: message.slice(0, 8000),
      host,
    });
    if (error) {
      console.error("submitContactForm:", error.message);
      return { error: errs.saveFailed };
    }
  } catch {
    return { error: errs.notConfigured };
  }

  redirect("/contact?sent=1");
}

export async function subscribeNewsletter(
  _prev: MarketingFormState,
  formData: FormData,
): Promise<MarketingFormState> {
  const locale = parseFormLocale(formData.get("locale"));
  const errs = getNewsletterFormErrors(locale);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hp = String(formData.get("company_website") ?? "").trim();
  if (hp) {
    return { ok: true };
  }
  if (!email || !email.includes("@")) {
    return { error: errs.invalidEmail };
  }

  const h = await headers();
  const ip = getClientIpFromHeaders((n) => h.get(n));
  const rl = await checkRateLimitDistributed(`newsletter:${ip}`, 25, 3_600_000);
  if (!rl.ok) {
    return { error: errs.rateLimited };
  }

  const source = String(formData.get("source") ?? "footer").slice(0, 64);

  try {
    const admin = createSupabaseServiceRoleClient();
    const { error } = await admin.from("marketing_newsletter_signups").upsert(
      { email, source },
      { onConflict: "email", ignoreDuplicates: true },
    );
    if (error && !error.message.includes("duplicate")) {
      console.error("subscribeNewsletter:", error.message);
      return { error: errs.subscribeFailed };
    }
  } catch {
    return { error: errs.notConfigured };
  }

  return { ok: true };
}
