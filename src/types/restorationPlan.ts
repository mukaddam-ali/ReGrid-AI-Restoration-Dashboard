import type { GridAsset, RepairCrew } from "./grid";

/** Frontend-only review state an engineer assigns to a recommendation. Not persisted. */
export type RecommendationReviewStatus =
  | "pending_review"
  | "accepted"
  | "flagged"
  | "sequence_overridden";

/** One contributor to a recommendation's deterministic priority score. */
export interface PriorityFactor {
  label: string;
  contribution: number;
  maxContribution: number;
  explanation: string;
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
