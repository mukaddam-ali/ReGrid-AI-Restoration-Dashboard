import type { RecommendationReviewStatus } from "@/types/restorationPlan";

const REVIEW_STATUS_LABEL: Record<RecommendationReviewStatus, string> = {
  pending_review: "Pending Review",
  accepted: "Accepted for Plan",
  flagged: "Flagged for Review",
  sequence_overridden: "Sequence Overridden",
};

export function ReviewBadge({ status }: { status: RecommendationReviewStatus }) {
  return <span className={`review-badge review-${status}`}>{REVIEW_STATUS_LABEL[status]}</span>;
}
