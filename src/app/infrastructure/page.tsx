import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function InfrastructurePage() {
  return (
    <div>
      <PageHeader
        title="Infrastructure"
        subtitle="Network schematic and asset inventory for the working sector."
      />
      <Card className="placeholder-card">
        The dependency network visualization and asset detail panel will appear
        here in a future milestone.
      </Card>
    </div>
  );
}
