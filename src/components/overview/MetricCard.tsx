import type { OverviewMetric } from "@/types/overview";

export function MetricCard({ label, value, sub, tone }: OverviewMetric) {
  return (
    <div className="card metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value metric-value-${tone} mono`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}
