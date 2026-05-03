import { redirect } from "next/navigation";

/** Legacy shared links used `/community/:slug`; canonical marketing + app paths use `/communities/...`. */
type Props = { params: Promise<{ slug: string }> };

export default async function LegacyCommunityRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/communities/${encodeURIComponent(slug)}`);
}
