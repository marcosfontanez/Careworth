/** Serializable chart rows passed from server components to client Recharts wrappers. */

export type GrowthPoint = { month: string; users: number };

export type EngagementDayPoint = {
  day: string;
  messages: number;
  reactions: number;
  shares: number;
};

export type AudienceSlice = { name: string; value: number; fill: string };

export type ReportReasonSlice = { name: string; value: number; fill: string };

export type ReportSourceBar = { source: string; count: number };

export type CircleActivityBar = { name: string; value: number };
