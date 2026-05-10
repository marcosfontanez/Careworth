import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';

function formatMonthYearFromCollectionName(collectionName: string | null | undefined): string {
  if (!collectionName) return '';
  const m = collectionName.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  );
  if (m) return `${m[1]} ${m[2]}`;
  const y = collectionName.match(/\b(20\d{2})\b/);
  return y ? y[1]! : collectionName.replace(/ champions$/i, '').trim();
}

export function formatAcquiredAtLabel(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Human line for detail modal — how the user got this border.
 */
export function acquisitionSummaryLine(entry: OwnedBorderEntry): string {
  const { inventory, item, collectionName, giftedByUsername } = entry;
  const src = inventory.acquisition_source;

  if (src === 'gifted' && giftedByUsername) {
    return `Gifted by @${giftedByUsername}`;
  }
  if (src === 'gifted') {
    return 'Gifted to you';
  }
  if (src === 'purchased') {
    return 'Purchased in Pulse Shop';
  }
  if (src === 'promotional') {
    return 'Promotional grant';
  }
  if (src === 'admin_grant') {
    return 'Granted by PulseVerse';
  }
  if (src === 'earned') {
    if (item.source_type === 'leaderboard_reward' && item.rank_place && collectionName) {
      const ord =
        item.rank_place === 1
          ? '1st'
          : item.rank_place === 2
            ? '2nd'
            : item.rank_place === 3
              ? '3rd'
              : `${item.rank_place}th`;
      const when = formatMonthYearFromCollectionName(collectionName);
      return when ? `Awarded for Top ${ord} in ${when}` : `Awarded for Top ${ord}`;
    }
    if (item.source_type === 'beta_reward') {
      return 'Earned from Beta';
    }
    if (item.source_type === 'seasonal_drop' && collectionName) {
      return `Earned — ${collectionName}`;
    }
    return 'Earned as a reward';
  }
  return 'Collected';
}
