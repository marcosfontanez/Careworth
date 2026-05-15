import { redirect } from "next/navigation";

/** @deprecated Use `/admin/merchandising?section=shop`. */
export default function AdminShopCatalogRedirectPage() {
  redirect("/admin/merchandising?section=shop");
}
