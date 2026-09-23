import type { RecommendationReviewStatus } from "@/types/restorationPlan";

/** Frontend-only per-recommendation review state, keyed by assetId. Not persisted. */
export interface ReviewState {
  status: RecommendationReviewStatus;
  overrideSequence: number | null;
}

export const DEFAULT_REVIEW_STATE: ReviewState = {
  status: "pending_review",
  overrideSequence: null,
};
