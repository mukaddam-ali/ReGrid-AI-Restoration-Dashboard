import { PageHeader } from "@/components/ui/PageHeader";
import { RestorationPlanWorkspace } from "@/components/restoration-plan/RestorationPlanWorkspace";
import { getRestorationPlan } from "@/services/restorationService";

export default async function RestorationPlanPage() {
  const items = await getRestorationPlan();

  return (
    <div>
      <PageHeader
        title="Restoration Plan"
        subtitle="Simulated recommended repair sequence, open for engineering review. AI recommends — engineers decide."
      />
      <RestorationPlanWorkspace items={items} />
    </div>
  );
}
