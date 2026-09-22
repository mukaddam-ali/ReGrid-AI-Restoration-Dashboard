import Link from "next/link";
import type { PriorityPreviewItem } from "@/types/overview";

export function PriorityPreview({ items }: { items: PriorityPreviewItem[] }) {
  return (
    <div className="card">
      <div className="panel-header">
        <div className="panel-title">Top Restoration Priorities</div>
        <Link href="/restoration-plan" className="panel-link">
          View full plan →
        </Link>
      </div>
      <div className="panel-subtitle">
        Highest-ranked assets from ReGrid&apos;s recommended restoration sequence.
      </div>
      <div className="priority-list">
        {items.map((item) => (
          <Link key={item.assetId} href="/restoration-plan" className="priority-row">
            <span className="priority-seq mono">{item.sequence}</span>
            <span className="priority-asset">
              <span className="priority-asset-id mono">{item.assetId}</span>
              <span className="priority-asset-type">{item.assetType}</span>
            </span>
            <span className="priority-repair">
              {item.estimatedRepairHours != null ? `${item.estimatedRepairHours}h repair` : "—"}
            </span>
            {item.criticalFacility ? (
              <span className="priority-critical">Serves {item.criticalFacility}</span>
            ) : (
              <span className="priority-critical" />
            )}
            <span className="priority-score mono">{item.priorityScore}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
