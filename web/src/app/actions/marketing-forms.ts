"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

export type MarketingFormState = { ok?: boolean; error?: string };

export async function submitContactForm(
  _prev: MarketingFormState,
  formData: FormData,
): Promise<MarketingFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const hp = String(formData.get("company_website") ?? "").trim();
  if (hp) {
    return { ok: true };
  }
  if (!name || !email || !message) {
    return { error: "Please fill in name, email, and message." };
  }

  let host: string | null = null;
  try {
    const h = await headers();
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
      return { error: "Could not send right now. Try again later or email us directly." };
    }
  } catch {
    return { error: "Contact form is not configured. Add Supabase keys to the server environment." };
  }

  redirect("/contact?sent=1");
}

export async function subscribeNewsletter(
  _prev: MarketingFormState,
  formData: FormData,
): Promise<MarketingFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hp = String(formData.get("company_website") ?? "").trim();
  if (hp) {
    return { ok: true };
  }
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
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
      return { error: "Could not subscribe right now. Try again later." };
    }
  } catch {
    return { error: "Newsletter is not configured yet." };
  }

  return { ok: true };
}
