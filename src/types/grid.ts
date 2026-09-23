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

/** Aggregate metrics for one evaluated scenario. See docs/scenario-model.md for definitions. */
export interface ScenarioMetrics {
  availableCrews: number;
  /** Sum of estimated repair hours over sequenced assets (missing estimates count as 0). */
  totalRepairWorkHours: number;
  /** Crew-aware planning estimate in hours; null when there are no crews to do the work. */
  estimatedPlanDurationHours: number | null;
  /** Aggregate capacity screening against offline service-area demand. Not power flow. */
  generationCapacityMw: number;
  demandServedMw: number;
  demandUnservedMw: number;
  populationServed: number;
  populationUnserved: number;
  unservedServiceAreaIds: string[];
}

export interface ScenarioFactorContribution {
  factor: string;
  contribution: number;
}

export interface ScenarioResult {
  scenarioId: string;
  scenario: RestorationScenario;
  recommendations: RestorationRecommendation[];
  metrics: ScenarioMetrics;
  /** Per-asset scoring factor contributions, used to explain differences between scenarios. */
  factorContributions: Record<string, ScenarioFactorContribution[]>;
  /** Crews kept in / removed from the planning roster by the crew-count rule. */
  crewIds: string[];
  removedCrewIds: string[];
}

export interface ScenarioFactorChange {
  factor: string;
  from: number;
  to: number;
}

/** Difference for one asset between the baseline and a modified scenario. */
export interface ScenarioChange {
  assetId: string;
  baselineSequence: number;
  modifiedSequence: number;
  baselineScore: number;
  modifiedScore: number;
  changedFactors: ScenarioFactorChange[];
  positionChanged: boolean;
  scoreChanged: boolean;
  explanation: string;
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
