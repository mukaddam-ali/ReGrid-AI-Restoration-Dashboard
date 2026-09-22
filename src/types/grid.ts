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
}

export interface CriticalFacility {
  id: string;
  name: string;
  type: string;
  assetId: string;
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
