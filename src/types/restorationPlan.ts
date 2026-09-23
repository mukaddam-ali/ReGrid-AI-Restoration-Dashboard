import type { GridAsset, RepairCrew } from "./grid";

/** Frontend-only review state an engineer assigns to a recommendation. Not persisted. */
export type RecommendationReviewStatus =
  | "pending_review"
  | "accepted"
  | "flagged"
  | "sequence_overridden";

/** One illustrative contributor to a recommendation's mock priority score. */
export interface PriorityFactor {
  label: string;
  contribution: number;
}

export interface RestorationPlanItem {
  assetId: string;
  asset: GridAsset;
  recommendedSequence: number;
  priorityScore: number;
  explanation: string;
  priorityFactors: PriorityFactor[];
  assignedCrew: RepairCrew | null;
  upstream: GridAsset[];
  downstream: GridAsset[];
}
