import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ScenariosPage() {
  return (
    <div>
      <PageHeader
        title="Scenarios"
        subtitle="Adjust crew and generation availability to compare restoration plans."
      />
      <Card className="placeholder-card">
        Scenario controls and the baseline-versus-modified comparison will appear
        here in a future milestone.
      </Card>
    </div>
  );
}
