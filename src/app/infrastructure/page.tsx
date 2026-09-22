import { PageHeader } from "@/components/ui/PageHeader";
import { InfrastructureWorkspace } from "@/components/infrastructure/InfrastructureWorkspace";
import { getAssets, getCrews, getInfrastructureNetwork } from "@/services/restorationService";

export default async function InfrastructurePage() {
  const [assets, crews, network] = await Promise.all([
    getAssets(),
    getCrews(),
    getInfrastructureNetwork(),
  ]);

  return (
    <div>
      <PageHeader
        title="Infrastructure"
        subtitle="Simulated network schematic and asset inspection for the working sector."
      />
      <InfrastructureWorkspace assets={assets} crews={crews} network={network} />
    </div>
  );
}
