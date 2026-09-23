import { useState } from "react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { GridAsset } from "@/types/grid";
import type { RestorationPlanItem } from "@/types/restorationPlan";
import { ReviewBadge } from "./ReviewBadge";
import type { ReviewState } from "./reviewState";

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value}</div>
    </div>
  );
}

function DependencyList({ title, assets, emptyLabel }: { title: string; assets: GridAsset[]; emptyLabel: string }) {
  return (
    <div className="detail-deps-column">
      <div className="detail-deps-title">{title}</div>
      {assets.length > 0 ? (
        <div className="detail-chip-list">
          {assets.map((asset) => (
            <div key={asset.id} className="detail-chip">
              <span className="mono detail-chip-id">{asset.id}</span>
              <span className="detail-chip-name">{asset.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="detail-empty">{emptyLabel}</div>
      )}
    </div>
  );
}

function OverrideSequenceControl({
  recommendedSequence,
  currentOverride,
  onApply,
}: {
  recommendedSequence: number;
  currentOverride: number | null;
  onApply: (sequence: number) => string | null;
}) {
  const [value, setValue] = useState(String(currentOverride ?? recommendedSequence));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="override-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          setError("Override sequence must be a number.");
          return;
        }
        setError(onApply(parsed));
      }}
    >
      <label htmlFor="override-sequence" className="review-current-label">
        Override sequence position
      </label>
      <input
        id="override-sequence"
        type="number"
        inputMode="numeric"
        className="override-input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
      />
      <button type="submit" className="review-btn">
        Apply Override
      </button>
      {error ? (
        <p className="override-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function RecommendationDetailPanel({
  item,
  review,
  onAccept,
  onFlag,
  onOverride,
}: {
  item: RestorationPlanItem | null;
  review: ReviewState;
  onAccept: () => void;
  onFlag: () => void;
  onOverride: (sequence: number) => string | null;
}) {
  if (!item) {
    return (
      <div className="card plan-detail-panel">
        <div className="panel-title">Recommendation Detail</div>
        <p className="placeholder-card infra-detail-placeholder">
          Select a recommendation from the restoration queue to inspect its priority breakdown
          and review it.
        </p>
      </div>
    );
  }

  const { asset } = item;

  return (
    <div className="card plan-detail-panel">
      <div className="detail-header">
        <div className="mono detail-id">{asset.id}</div>
        <div className="detail-name">{asset.name}</div>
      </div>

      <div className="detail-badges">
        <StatusBadge status={asset.status} />
        <ReviewBadge status={review.status} />
      </div>

      <div className="detail-grid">
        <DetailField label="Type" value={asset.type} />
        {asset.damageSeverity ? <DetailField label="Damage Severity" value={asset.damageSeverity} /> : null}
        {asset.estimatedRepairHours != null ? (
          <DetailField label="Est. Repair Time" value={`${asset.estimatedRepairHours}h`} />
        ) : null}
        {asset.populationServed != null ? (
          <DetailField label="Population Served" value={asset.populationServed.toLocaleString("en-US")} />
        ) : null}
        {asset.demandMw != null ? <DetailField label="Demand" value={`${asset.demandMw} MW`} /> : null}
        {asset.criticalFacility ? (
          <DetailField label="Critical Facility Served" value={asset.criticalFacility} />
        ) : null}
        {item.assignedCrew ? <DetailField label="Assigned Crew" value={item.assignedCrew.name} /> : null}
        <DetailField label="Priority Score" value={item.priorityScore} />
        <DetailField label="Recommended Sequence" value={item.recommendedSequence} />
      </div>

      <div>
        <div className="plan-section-title">Why this priority?</div>
        <p className="plan-section-note">
          Simulated priority factors — illustrative prototype scoring breakdown, not ReGrid&apos;s
          final scoring formula.
        </p>
        <div className="factor-list">
          {item.priorityFactors.map((factor) => (
            <div key={factor.label} className="factor-row">
              <span className="factor-label">{factor.label}</span>
              <span className="factor-value mono">
                {factor.contribution >= 0 ? "+" : ""}
                {factor.contribution}
              </span>
            </div>
          ))}
        </div>
        <div className="factor-total-row">
          <span className="factor-total-label">Total Priority Score</span>
          <span className="factor-total-value mono">{item.priorityScore}</span>
        </div>
        <p className="plan-explanation">{item.explanation}</p>
      </div>

      <div className="detail-deps">
        <DependencyList title="Upstream Dependencies" assets={item.upstream} emptyLabel="No upstream dependencies recorded." />
        <DependencyList
          title="Downstream Dependencies"
          assets={item.downstream}
          emptyLabel="No downstream dependencies recorded."
        />
      </div>

      <div className="review-controls">
        <div className="plan-section-title">Engineer Review</div>
        <div className="review-actions">
          <button
            type="button"
            className={`review-btn${review.status === "accepted" ? " review-btn-active" : ""}`}
            onClick={onAccept}
          >
            Accept for Plan
          </button>
          <button
            type="button"
            className={`review-btn${review.status === "flagged" ? " review-btn-active" : ""}`}
            onClick={onFlag}
          >
            Flag for Review
          </button>
        </div>
        <OverrideSequenceControl
          key={item.assetId}
          recommendedSequence={item.recommendedSequence}
          currentOverride={review.overrideSequence}
          onApply={onOverride}
        />
        {review.overrideSequence != null ? (
          <div className="review-override-summary">
            <p className="review-note">Original ReGrid sequence: {item.recommendedSequence}</p>
            <p className="review-note">Engineer override sequence: {review.overrideSequence}</p>
            <p className="review-note">Priority scores are not recalculated.</p>
          </div>
        ) : null}
        <p className="review-note">
          Review actions are frontend planning state for this session only. AI recommends —
          engineers decide. No repair, switching, or dispatch action occurs here.
        </p>
      </div>
    </div>
  );
}
