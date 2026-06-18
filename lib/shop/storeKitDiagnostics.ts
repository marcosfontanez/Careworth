import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { StoreProductPreview } from '@/lib/shop/iap';
import { IOS_BUNDLE_ID } from '@/lib/shop/appStoreProducts';

export type StoreKitDiagnosticPayload = {
  platform: string;
  buildType: 'dev' | 'release';
  bundleId: string;
  requestedProductIds: string[];
  returnedProductIds: string[];
  missingProductIds: string[];
  products: StoreProductPreview[];
  storeEnvironment?: string;
};

function resolveBundleId(): string {
  return (
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package ??
    IOS_BUNDLE_ID
  );
}

export function formatStoreKitDiagnosticsText(payload: StoreKitDiagnosticPayload): string {
  const lines = [
    '── Pulse Shop StoreKit diagnostics ──',
    `platform: ${payload.platform}`,
    `build: ${payload.buildType}`,
    `bundleId: ${payload.bundleId}`,
    payload.storeEnvironment ? `storeEnvironment: ${payload.storeEnvironment}` : null,
    `requested (${payload.requestedProductIds.length}): ${payload.requestedProductIds.join(', ') || '(none)'}`,
    `returned (${payload.returnedProductIds.length}): ${payload.returnedProductIds.join(', ') || '(none)'}`,
    payload.missingProductIds.length
      ? `missing (${payload.missingProductIds.length}): ${payload.missingProductIds.join(', ')}`
      : 'missing: (none)',
    '',
    'localized products:',
    ...(payload.products.length
      ? payload.products.map(
          (p) =>
            `  · ${p.productId}${p.title ? ` — ${p.title}` : ''}${p.displayPrice ? ` @ ${p.displayPrice}` : ''}`,
        )
      : ['  (none returned)']),
    '────────────────────────────────────',
  ].filter(Boolean);

  return lines.join('\n');
}

/** Staff / dev only — never call for normal production users. */
export function logStoreKitDiagnostics(payload: StoreKitDiagnosticPayload): void {
  console.log(formatStoreKitDiagnosticsText(payload));
}

export function buildStoreKitDiagnosticPayload(
  requestedProductIds: string[],
  products: StoreProductPreview[],
  missingProductIds: string[],
): StoreKitDiagnosticPayload {
  return {
    platform: Platform.OS,
    buildType: __DEV__ ? 'dev' : 'release',
    bundleId: resolveBundleId(),
    requestedProductIds,
    returnedProductIds: products.map((p) => p.productId),
    missingProductIds,
    products,
    storeEnvironment: __DEV__
      ? 'sandbox (dev build)'
      : Platform.OS === 'ios'
        ? 'TestFlight uses Sandbox — sign in under Settings → App Store → Sandbox Account'
        : undefined,
  };
}
