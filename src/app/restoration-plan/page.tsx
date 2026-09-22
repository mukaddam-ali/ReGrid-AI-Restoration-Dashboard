import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RestorationPlanPage() {
  return (
    <div>
      <PageHeader
        title="Restoration Plan"
        subtitle="Ranked restoration recommendations for engineering review."
      />
      <Card className="placeholder-card">
        The restoration priority queue, scoring breakdown, and engineer decision
        controls (Accept, Flag for Review, Override) will appear here in a future
        milestone.
      </Card>
    </div>
  );
}
