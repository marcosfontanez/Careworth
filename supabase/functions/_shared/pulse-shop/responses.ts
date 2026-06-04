import { edgeCorsHeaders } from "../edgeCors.ts";

export type PulseShopErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "SERVER_MISCONFIGURED"
  | "STORE_NOT_CONFIGURED"
  | "INVALID_RECEIPT"
  | "STORE_REJECTED"
  | "PRODUCT_MISMATCH"
  | "ITEM_INACTIVE"
  | "ITEM_TYPE_MISMATCH"
  | "DUPLICATE_PURCHASE"
  | "FULFILLMENT_FAILED"
  | "INSUFFICIENT_SPARKS"
  | "INVALID_RECIPIENT"
  | "SELF_GIFT_NOT_ALLOWED"
  | "GIFT_BLOCKED"
  | "NOT_ALLOWED"
  | "UNKNOWN";

export type PulseShopErrorBody = {
  code: PulseShopErrorCode;
  message: string;
  details?: unknown;
};

export type PulseShopSuccess<T extends Record<string, unknown>> = {
  ok: true;
  data: T;
};

export type PulseShopFailure = {
  ok: false;
  error: PulseShopErrorBody;
};

export type PulseShopResult<T extends Record<string, unknown>> = PulseShopSuccess<T> | PulseShopFailure;

export function pulseShopCorsHeaders(_req: Request): Record<string, string> {
  return edgeCorsHeaders({
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-pulse-shop-nonce",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
}

export function jsonResponse(
  req: Request,
  body: PulseShopResult<Record<string, unknown>>,
  status = 200,
): Response {
  const httpStatus = body.ok ? status : errorToStatus(body.error.code);
  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { ...pulseShopCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function optionsResponse(req: Request): Response {
  return new Response(null, { headers: pulseShopCorsHeaders(req) });
}

function errorToStatus(code: PulseShopErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "INVALID_INPUT":
    case "PRODUCT_MISMATCH":
    case "ITEM_TYPE_MISMATCH":
      return 400;
    case "ITEM_INACTIVE":
      return 409;
    case "DUPLICATE_PURCHASE":
      return 200;
    case "INVALID_RECEIPT":
    case "STORE_REJECTED":
    case "INSUFFICIENT_SPARKS":
    case "INVALID_RECIPIENT":
    case "SELF_GIFT_NOT_ALLOWED":
    case "GIFT_BLOCKED":
    case "NOT_ALLOWED":
    case "FULFILLMENT_FAILED":
      return 422;
    case "SERVER_MISCONFIGURED":
    case "STORE_NOT_CONFIGURED":
      return 503;
    default:
      return 500;
  }
}

export function ok<T extends Record<string, unknown>>(data: T): PulseShopSuccess<T> {
  return { ok: true, data };
}

export function err(
  code: PulseShopErrorCode,
  message: string,
  details?: unknown,
): PulseShopFailure {
  return { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

/** Map Postgres / RPC exception text to client codes (see economy RPCs). */
export function mapRpcException(e: { message?: string; code?: string; details?: string }): PulseShopErrorCode {
  const msg = (e.message ?? e.details ?? "").toLowerCase();
  if (msg.includes("insufficient_sparks")) return "INSUFFICIENT_SPARKS";
  if (msg.includes("duplicate_border")) return "DUPLICATE_PURCHASE";
  if (msg.includes("invalid_recipient")) return "INVALID_RECIPIENT";
  if (msg.includes("self_gift_not_allowed")) return "SELF_GIFT_NOT_ALLOWED";
  if (msg.includes("gift_blocked")) return "GIFT_BLOCKED";
  if (msg.includes("invalid_receipt")) return "INVALID_RECEIPT";
  if (msg.includes("item_not_active") || msg.includes("gift_not_found")) return "ITEM_INACTIVE";
  if (msg.includes("not_allowed")) return "NOT_ALLOWED";
  return "FULFILLMENT_FAILED";
}
