"use client";

import { track } from "@vercel/analytics";

import { MARKETING_EVENTS, type HomepageConversionProps } from "@/lib/marketing-analytics";

export type MarketingDeviceType = "mobile_ios" | "mobile_android" | "tablet" | "desktop" | "unknown";

/** Lightweight UA hint for conversion events — not used for targeting or storage. */
export function getMarketingDeviceType(): MarketingDeviceType {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "mobile_ios";
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return "tablet";
  if (/Android/.test(ua)) return "mobile_android";
  if (/Mobile/.test(ua)) return "mobile_android";
  return "desktop";
}

type ConversionEvent = (typeof MARKETING_EVENTS)[keyof typeof MARKETING_EVENTS];

export function trackHomepageConversion(event: ConversionEvent, props: HomepageConversionProps = {}) {
  track(event, {
    page: props.page ?? "/",
    section: props.section,
    cta_label: props.cta_label,
    destination: props.destination,
    device_type: props.device_type ?? getMarketingDeviceType(),
  });
}
