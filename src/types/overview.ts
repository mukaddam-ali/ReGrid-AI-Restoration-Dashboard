import type { CriticalFacilityStatus } from "./grid";

export interface OverviewMetric {
  label: string;
  value: string;
  sub: string;
  tone: "neutral" | "warning" | "critical" | "positive";
}

export interface CriticalFacilityOverview {
  id: string;
  name: string;
  type: string;
  status: CriticalFacilityStatus;
}

export interface PriorityPreviewItem {
  assetId: string;
  assetName: string;
  assetType: string;
  sequence: number;
  priorityScore: number;
  estimatedRepairHours: number | null;
  criticalFacility: string | null;
}

export interface OverviewSummary {
  metrics: OverviewMetric[];
  topPriorities: PriorityPreviewItem[];
  criticalFacilities: CriticalFacilityOverview[];
  contextNote: string;
}
