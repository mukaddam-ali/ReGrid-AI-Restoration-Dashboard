import { PageHeader } from "@/components/ui/PageHeader";
import { ScenarioWorkspace } from "@/components/scenarios/ScenarioWorkspace";
import { getScenarioWorkspaceData } from "@/services/restorationService";

export default async function ScenariosPage() {
  const { input, baseline, assets } = await getScenarioWorkspaceData();

  return (
    <div>
      <PageHeader
        title="Scenarios"
        subtitle="Adjust planning conditions and recalculate the restoration plan with the deterministic scoring and sequencing engines."
      />
      <ScenarioWorkspace input={input} baselineScenario={baseline} assets={assets} />
    </div>
  );
}
