"use client";

import { useState } from "react";
import type { GridAsset, RepairCrew } from "@/types/grid";
import type { InfrastructureNetwork } from "@/types/infrastructure";
import { NetworkSchematic } from "./NetworkSchematic";
import { AssetDetailPanel } from "./AssetDetailPanel";

export function InfrastructureWorkspace({
  assets,
  crews,
  network,
}: {
  assets: GridAsset[];
  crews: RepairCrew[];
  network: InfrastructureNetwork;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const assetById = new Map(assets.map((a) => [a.id, a]));
  const crewById = new Map(crews.map((c) => [c.id, c]));
  const selectedNode = network.nodes.find((n) => n.assetId === selectedAssetId) ?? null;

  const selectedAsset = selectedAssetId ? (assetById.get(selectedAssetId) ?? null) : null;

  const upstream = (selectedNode?.upstreamAssetIds ?? [])
    .map((id) => assetById.get(id))
    .filter((a): a is GridAsset => a != null);
  const downstream = (selectedNode?.downstreamAssetIds ?? [])
    .map((id) => assetById.get(id))
    .filter((a): a is GridAsset => a != null);

  const assignedCrew = selectedAsset?.assignedCrewId
    ? (crewById.get(selectedAsset.assignedCrewId) ?? null)
    : null;

  return (
    <div className="infra-columns">
      <NetworkSchematic network={network} selectedAssetId={selectedAssetId} onSelect={setSelectedAssetId} />
      <AssetDetailPanel
        asset={selectedAsset}
        upstream={upstream}
        downstream={downstream}
        assignedCrew={assignedCrew}
        onSelectAsset={setSelectedAssetId}
      />
    </div>
  );
}
