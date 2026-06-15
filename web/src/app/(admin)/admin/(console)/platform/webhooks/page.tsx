import { WebhookOutboxConsole } from "@/components/admin/webhook-outbox-console";
import {
  loadWebhookOutboxEventTypes,
  loadWebhookOutboxEvents,
  loadWebhookOutboxSummary,
  parseWebhookOutboxFilters,
} from "@/lib/admin/webhook-outbox";

export default async function AdminWebhookOutboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseWebhookOutboxFilters(sp);

  const [summary, list, eventTypes] = await Promise.all([
    loadWebhookOutboxSummary(),
    loadWebhookOutboxEvents(filters),
    loadWebhookOutboxEventTypes(),
  ]);

  return (
    <WebhookOutboxConsole
      summary={summary}
      events={list.events}
      total={list.total}
      eventTypes={eventTypes}
      filters={filters}
    />
  );
}
