import { redirect } from "next/navigation";

/** @deprecated Use `/admin/merchandising?section=frames`. */
export default function AdminAvatarBordersRedirectPage() {
  redirect("/admin/merchandising?section=frames");
}
