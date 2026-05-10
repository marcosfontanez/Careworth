import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Legacy route: deep links and older screens may still open `/my-borders`.
 * Borders UI now lives at the bottom of Customize My Pulse (Look tab).
 */
export default function MyBordersRoute() {
  const params = useLocalSearchParams<{ collectionId?: string }>();
  const raw = params.collectionId;
  const collectionId =
    typeof raw === 'string'
      ? raw.trim()
      : Array.isArray(raw) && raw[0]
        ? String(raw[0]).trim()
        : '';

  const qs = new URLSearchParams({ focus: 'borders' });
  if (collectionId) qs.set('collectionId', collectionId);

  return <Redirect href={`/my-pulse-appearance?${qs.toString()}` as any} />;
}
