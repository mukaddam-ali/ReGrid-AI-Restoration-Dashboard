import type { RecommendationReviewStatus, RestorationPlanItem } from "@/types/restorationPlan";
import { ReviewBadge } from "./ReviewBadge";

export function RestorationQueue({
  items,
  selectedAssetId,
  reviewStatusFor,
  onSelect,
}: {
  items: RestorationPlanItem[];
  selectedAssetId: string | null;
  reviewStatusFor: (assetId: string) => RecommendationReviewStatus;
  onSelect: (assetId: string) => void;
}) {
  return (
    <div className="card plan-queue-card">
      <div className="panel-header">
        <div>
          <div className="panel-title">Restoration Queue</div>
          <div className="panel-subtitle" style={{ marginBottom: 0 }}>
            ReGrid&apos;s recommended repair sequence, ranked by simulated priority score.
          </div>
        </div>
      </div>

      <div className="plan-queue-scroll">
        <div className="plan-queue-list">
          {items.map((item) => {
            const selected = item.assetId === selectedAssetId;
            return (
              <button
                key={item.assetId}
                type="button"
                className={`plan-row${selected ? " plan-row-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => onSelect(item.assetId)}
              >
                <span className="plan-row-seq mono">{item.recommendedSequence}</span>
                <span className="plan-row-asset">
                  <span className="mono plan-row-asset-id">{item.assetId}</span>
                  <span className="plan-row-asset-type">{item.asset.name}</span>
                </span>
                <span className="plan-row-score mono">{item.priorityScore}</span>
                <span className="plan-row-repair">
                  {item.asset.estimatedRepairHours != null ? `${item.asset.estimatedRepairHours}h repair` : "—"}
                </span>
                <span className="plan-row-meta">
                  {item.asset.criticalFacility ? (
                    <span className="plan-row-facility">Serves {item.asset.criticalFacility}</span>
                  ) : null}
                  {item.assignedCrew ? <span className="plan-row-crew">Crew: {item.assignedCrew.name}</span> : null}
                </span>
                <ReviewBadge status={reviewStatusFor(item.assetId)} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
