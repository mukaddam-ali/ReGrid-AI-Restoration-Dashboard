import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/overview/MetricCard";
import { PriorityPreview } from "@/components/overview/PriorityPreview";
import { CriticalFacilitySnapshot } from "@/components/overview/CriticalFacilitySnapshot";
import { getOverviewSummary } from "@/services/restorationService";

export default async function OverviewPage() {
  const summary = await getOverviewSummary();

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Regional grid status and restoration summary."
      />

      <div className="metric-grid">
        {summary.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="overview-columns">
        <PriorityPreview items={summary.topPriorities} />
        <CriticalFacilitySnapshot facilities={summary.criticalFacilities} />
      </div>

      <Card className="context-panel">{summary.contextNote}</Card>
    </div>
  );
}
