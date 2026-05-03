import type { Metadata } from "next";

import { AuthEmailConfirmClient } from "@/components/auth/auth-email-confirm-client";

export const metadata: Metadata = {
  title: "Confirm email — PulseVerse",
  description: "Finish verifying your PulseVerse account.",
  robots: { index: false, follow: false },
};

export default function AuthConfirmPage() {
  return (
    <div
      className="relative flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(20,184,166,0.12), transparent)",
      }}
    >
      <AuthEmailConfirmClient />
    </div>
  );
}
