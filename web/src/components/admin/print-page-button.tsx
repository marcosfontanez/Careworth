"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintPageButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      Print summary
    </Button>
  );
}
