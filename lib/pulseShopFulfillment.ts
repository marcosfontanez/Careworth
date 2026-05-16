/**
 * Client helper for `pulse-shop-fulfillment` Edge Function.
 * Always send the user access token; never send service keys from the app.
 */

import { parsePulseShopFulfillmentJson } from './pulseShopFulfillmentParse';
import { supabase } from './supabase';

const PROJECT_FUNCTIONS = 'functions/v1';

export type PulseShopAction =
  | 'fulfill_spark_pack'
  | 'fulfill_border_self'
  | 'fulfill_border_gift'
  | 'send_creator_gift';

export type PulseShopRequest = {
  action: PulseShopAction;
  shop_item_id: string;
  platform?: 'ios' | 'android';
  receipt?: {
    ios?: { receipt_data_base64: string };
    android?: { purchase_token: string; product_id?: string };
  };
  border_gift?: {
    recipient_handle: string;
    note?: string | null;
  };
  creator_gift?: {
    creator_user_id: string;
    context_type: 'live' | 'post' | 'profile';
    context_id: string | null;
    idempotency_key: string;
  };
};

export type PulseShopErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'SERVER_MISCONFIGURED'
  | 'STORE_NOT_CONFIGURED'
  | 'INVALID_RECEIPT'
  | 'STORE_REJECTED'
  | 'PRODUCT_MISMATCH'
  | 'ITEM_INACTIVE'
  | 'ITEM_TYPE_MISMATCH'
  | 'DUPLICATE_PURCHASE'
  | 'FULFILLMENT_FAILED'
  | 'INSUFFICIENT_SPARKS'
  | 'INVALID_RECIPIENT'
  | 'SELF_GIFT_NOT_ALLOWED'
  | 'NOT_ALLOWED'
  | 'UNKNOWN';

type Failure = {
  ok: false;
  error: { code: PulseShopErrorCode; message: string; details?: unknown };
};

type Success<T> = { ok: true; data: T };

export type PulseShopResponse<T extends Record<string, unknown> = Record<string, unknown>> =
  | Success<T>
  | Failure;

export async function invokePulseShopFulfillment<T extends Record<string, unknown>>(
  body: PulseShopRequest,
): Promise<PulseShopResponse<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not signed in.' } };
  }

  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    return {
      ok: false,
      error: { code: 'SERVER_MISCONFIGURED', message: 'EXPO_PUBLIC_SUPABASE_URL missing.' },
    };
  }

  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const res = await fetch(`${base}/${PROJECT_FUNCTIONS}/pulse-shop-fulfillment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as unknown;
  const parsed = parsePulseShopFulfillmentJson(json);
  if (!parsed.ok && parsed.error.code === 'FULFILLMENT_FAILED' && json === null) {
    return {
      ok: false,
      error: {
        code: 'FULFILLMENT_FAILED',
        message: `Invalid response (${res.status})`,
        details: null,
      },
    };
  }
  return parsed as PulseShopResponse<T>;
}
