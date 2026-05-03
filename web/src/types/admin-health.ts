/** Derived from {@link loadSystemHealthSnapshot} for the admin sidebar status strip. */
export type AdminHealthStrip = {
  operationalCount: number;
  total: number;
  worst: "operational" | "degraded" | "down";
};
