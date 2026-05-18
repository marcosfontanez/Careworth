"use client";

import { Button } from "@/components/ui/button";

export function AdminPrintPdfButton() {
  return (
    <Button type="button" size="sm" className="bg-primary text-primary-foreground" onClick={() => window.print()}>
      Print / Save PDF
    </Button>
  );
}
