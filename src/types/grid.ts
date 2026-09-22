export type AssetStatus = "operational" | "damaged" | "critical" | "repair" | "restored";

export interface GridAsset {
  id: string;
  name: string;
  type: string;
  status: AssetStatus;
  damageSeverity?: "Minor" | "Moderate" | "Severe" | null;
  estimatedRepairHours?: number | null;
  populationServed?: number | null;
  demandMw?: number | null;
  assignedCrewId?: string | null;
  /** Name of the critical facility this asset feeds, if any. */
  criticalFacility?: string | null;
}

/** Simple, non-graph-derived status shown in the Overview snapshot. */
export type CriticalFacilityStatus = "online" | "offline" | "at_risk" | "dependency_blocked";

export interface CriticalFacility {
  id: string;
  name: string;
  type: string;
  assetId: string;
  status: CriticalFacilityStatus;
}

export interface Dependency {
  id: string;
  upstreamAssetId: string;
  downstreamAssetId: string;
  type?: string;
}

export interface RepairCrew {
  id: string;
  name: string;
  status: "available" | "assigned" | "en_route";
  assignedAssetId?: string | null;
}

export interface RestorationRecommendation {
  assetId: string;
  priorityScore: number;
  recommendedSequence: number;
  explanation: string;
}

export interface RestorationScenario {
  id: string;
  name: string;
  availableCrews: number;
  generationCapacityMw: number;
}

export interface ScenarioResult {
  scenarioId: string;
  recommendations: RestorationRecommendation[];
}

/**
 * A non-overlapping simulated population/demand zone. Unlike GridAsset
 * fields (which are contextual per-asset figures and may overlap along a
 * dependency chain), ServiceArea records are authored so that summing
 * `population` or `demandMw` across any subset never double counts the
 * same simulated customers.
 */
export interface ServiceArea {
  id: string;
  name: string;
  population: number;
  demandMw: number;
  status: "online" | "offline";
  suppliedByAssetId: string;
}
