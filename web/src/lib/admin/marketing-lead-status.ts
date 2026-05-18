/** Allowed CRM-lite statuses for marketing_contact_messages (migration `189_marketing_contact_messages_crm_lite.sql`). */

export const MARKETING_LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "closed_won",
  "closed_lost",
] as const;

export type MarketingLeadStatus = (typeof MARKETING_LEAD_STATUSES)[number];

export function isMarketingLeadStatus(s: string): s is MarketingLeadStatus {
  return (MARKETING_LEAD_STATUSES as readonly string[]).includes(s);
}
