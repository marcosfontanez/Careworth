"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function SupportFaqAccordion({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <Accordion className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02] px-2">
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`faq-${i}`} className="border-0">
          <AccordionTrigger className="px-4 py-4 text-base font-medium text-foreground hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="px-4 text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
