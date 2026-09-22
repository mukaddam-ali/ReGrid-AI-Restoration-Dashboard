import type {
  CriticalFacility,
  Dependency,
  GridAsset,
  RepairCrew,
  RestorationRecommendation,
  RestorationScenario,
} from "@/types/grid";

// Simulated prototype dataset — not real utility or ABB data.
export const mockAssets: GridAsset[] = [
  {
    id: "GEN-01",
    name: "Northside Generation Station",
    type: "Generation",
    status: "operational",
  },
  {
    id: "LINE-05",
    name: "Northside Trunk Line",
    type: "Transmission Line",
    status: "operational",
  },
  {
    id: "SUB-04",
    name: "Meridian Substation",
    type: "Substation",
    status: "damaged",
    damageSeverity: "Severe",
    estimatedRepairHours: 6,
    populationServed: 18400,
    demandMw: 6.2,
    assignedCrewId: "CREW-BRAVO",
  },
  {
    id: "FEEDER-03",
    name: "Hospital Distribution Feeder",
    type: "Distribution Feeder",
    status: "damaged",
    damageSeverity: "Minor",
    estimatedRepairHours: 2,
    demandMw: 1.1,
  },
  {
    id: "FAC-HOSPITAL",
    name: "Regional Medical Center",
    type: "Critical Facility — Hospital",
    status: "critical",
  },
];

export const mockCriticalFacilities: CriticalFacility[] = [
  { id: "CF-HOSPITAL", name: "Regional Medical Center", type: "Hospital", assetId: "FAC-HOSPITAL" },
];

export const mockDependencies: Dependency[] = [
  { id: "DEP-1", upstreamAssetId: "GEN-01", downstreamAssetId: "LINE-05", type: "feeds" },
  { id: "DEP-2", upstreamAssetId: "LINE-05", downstreamAssetId: "SUB-04", type: "feeds" },
  { id: "DEP-3", upstreamAssetId: "SUB-04", downstreamAssetId: "FEEDER-03", type: "feeds" },
  { id: "DEP-4", upstreamAssetId: "FEEDER-03", downstreamAssetId: "FAC-HOSPITAL", type: "feeds" },
];

export const mockCrews: RepairCrew[] = [
  { id: "CREW-BRAVO", name: "Crew Bravo", status: "assigned", assignedAssetId: "SUB-04" },
];

export const mockRecommendations: RestorationRecommendation[] = [
  {
    assetId: "SUB-04",
    priorityScore: 94,
    recommendedSequence: 1,
    explanation:
      "Supplies a critical hospital and roughly 18,400 residents. Illustrative scoring only.",
  },
  {
    assetId: "FEEDER-03",
    priorityScore: 70,
    recommendedSequence: 2,
    explanation: "Final leg into the hospital; only effective once SUB-04 is restored.",
  },
];

export const mockBaselineScenario: RestorationScenario = {
  id: "baseline",
  name: "Baseline",
  availableCrews: 3,
  generationCapacityMw: 60,
};
