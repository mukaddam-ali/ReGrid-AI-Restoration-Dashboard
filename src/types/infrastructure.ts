import type { AssetStatus } from "./grid";

export interface NetworkNode {
  assetId: string;
  name: string;
  type: string;
  status: AssetStatus;
  /** Column index for the tiered layout (Generation → Line → Substation → Feeder → Facility). */
  tier: number;
  /** Row index within its tier, for vertical positioning. */
  row: number;
  isCriticalFacility: boolean;
  criticalFacility?: string | null;
  /** Immediate upstream/downstream asset ids, derived from the dependency dataset. */
  upstreamAssetIds: string[];
  downstreamAssetIds: string[];
}

export interface NetworkEdge {
  id: string;
  fromAssetId: string;
  toAssetId: string;
}

export interface InfrastructureNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  tierCount: number;
}
