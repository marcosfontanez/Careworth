import { describe, expect, it } from "vitest";

import { localeFromAcceptLanguage } from "@/lib/locale-preference";

describe("localeFromAcceptLanguage", () => {
  it("defaults when header missing", () => {
    expect(localeFromAcceptLanguage(null)).toBe("en");
    expect(localeFromAcceptLanguage("")).toBe("en");
  });

  it("matches Spanish tags", () => {
    expect(localeFromAcceptLanguage("es")).toBe("es");
    expect(localeFromAcceptLanguage("es-ES, en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("en-US, es;q=0.9")).toBe("en");
  });
});
