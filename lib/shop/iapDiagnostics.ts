/**
 * IAP lifecycle tracing — never log receipt bodies, tokens, or secrets.
 *
 * Sandbox / TestFlight checklist (iOS):
 * - TestFlight IAP uses the Sandbox environment.
 * - Settings → App Store → Sandbox Account — sign in with a sandbox tester.
 * - Sign out of production Media & Purchases if prompts loop.
 * - Use a fresh sandbox tester if auth keeps repeating.
 * - Confirm Paid Apps Agreement is Active in App Store Connect → Business.
 * - Opening Pulse Shop must NOT prompt for Apple ID — only Purchase / Restore taps may.
 */

import Constants from 'expo-constants';

type IapDiagPayload = Record<string, string | number | boolean | null | undefined>;

let staffIapDiagEnabled = false;

/** Staff / TestFlight debugging — enable structured IAP logs without exposing secrets. */
export function setStaffIapDiagnostics(enabled: boolean): void {
  staffIapDiagEnabled = enabled;
}

function shouldLogIap(): boolean {
  if (__DEV__) return true;
  if (staffIapDiagEnabled) return true;
  if (process.env.EXPO_PUBLIC_IAP_DIAG === '1') return true;
  const extra = Constants.expoConfig?.extra as { iapDiagnostics?: boolean } | undefined;
  return extra?.iapDiagnostics === true;
}

export function iapDiag(event: string, payload?: IapDiagPayload): void {
  if (!shouldLogIap()) return;
  const suffix = payload
    ? ` ${Object.entries(payload)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ')}`
    : '';
  console.log(`[IAP] ${event}${suffix}`);
}

export function iapDiagStaff(event: string, payload?: IapDiagPayload): void {
  iapDiag(event, payload);
}

export const IAP_EVENTS = {
  SHOP_MOUNT: 'SHOP_MOUNT',
  IAP_INIT_START: 'IAP_INIT_START',
  IAP_INIT_DONE: 'IAP_INIT_DONE',
  IAP_FETCH_PRODUCTS_START: 'IAP_FETCH_PRODUCTS_START',
  IAP_FETCH_PRODUCTS_DONE: 'IAP_FETCH_PRODUCTS_DONE',
  IAP_RESTORE_START: 'IAP_RESTORE_START',
  IAP_RESTORE_DONE: 'IAP_RESTORE_DONE',
  IAP_PURCHASE_REQUEST_START: 'IAP_PURCHASE_REQUEST_START',
  IAP_PURCHASE_CALLBACK: 'IAP_PURCHASE_CALLBACK',
  IAP_PURCHASE_ERROR: 'IAP_PURCHASE_ERROR',
  IAP_FULFILLMENT_START: 'IAP_FULFILLMENT_START',
  IAP_FULFILLMENT_SUCCESS: 'IAP_FULFILLMENT_SUCCESS',
  IAP_FULFILLMENT_ERROR: 'IAP_FULFILLMENT_ERROR',
  IAP_FINISH_TRANSACTION_START: 'IAP_FINISH_TRANSACTION_START',
  IAP_FINISH_TRANSACTION_DONE: 'IAP_FINISH_TRANSACTION_DONE',
  IAP_LOADING_CLEARED: 'IAP_LOADING_CLEARED',
  IAP_LISTENERS_REGISTERED: 'IAP_LISTENERS_REGISTERED',
} as const;
