import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { default: "Admin", template: "%s · Admin" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
