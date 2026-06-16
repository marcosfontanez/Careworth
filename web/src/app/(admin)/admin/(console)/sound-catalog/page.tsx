import { SoundCatalogConsole } from "@/components/admin/sound-catalog-console";
import { loadSoundCatalog, loadSoundCatalogSummary, parseSoundCatalogFilters } from "@/lib/admin/sound-catalog";

export default async function AdminSoundCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseSoundCatalogFilters(sp);

  const [summary, list] = await Promise.all([loadSoundCatalogSummary(), loadSoundCatalog(filters)]);

  return (
    <SoundCatalogConsole summary={summary} sounds={list.sounds} total={list.total} filters={filters} />
  );
}
