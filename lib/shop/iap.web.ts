/**
 * Web stub — do not import react-native-iap (pulls react-native-nitro-modules; breaks Metro web).
 */
import { Platform } from 'react-native';

export type PurchasePlatform = 'ios' | 'android';

export type IapPurchaseResult =
  | {
      ok: true;
      receiptPayload: string;
      productId: string;
      transactionId?: string;
    }
  | { ok: false; code: string; message: string };

export async function initIapConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: false, message: 'Store purchases are only available on the iOS/Android app build.' };
}

export async function endIapConnection(): Promise<void> {}

export function platformPrefix(): PurchasePlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

export async function purchaseSku(_params: {
  sku: string;
  isConsumable?: boolean;
}): Promise<IapPurchaseResult> {
  return {
    ok: false,
    code: 'IAP_UNAVAILABLE',
    message: 'In-app purchases are not available on web. Use the PulseVerse app.',
  };
}
