import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OverviewPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Regional grid status and restoration summary."
      />
      <Card className="placeholder-card">
        Summary metrics, the critical path snapshot, and the restoration priority
        queue preview will appear here in a future milestone.
      </Card>
    </div>
  );
}
