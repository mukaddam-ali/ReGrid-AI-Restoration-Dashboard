import type {
  CriticalFacility,
  Dependency,
  GridAsset,
  RepairCrew,
  RestorationScenario,
  ServiceArea,
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
    id: "LINE-12",
    name: "Eastline Trunk",
    type: "Transmission Line",
    status: "damaged",
    damageSeverity: "Moderate",
    estimatedRepairHours: 5,
    // Asset-level figure for display/context only — not used for Overview
    // regional totals, which are aggregated from mockServiceAreas instead.
    populationServed: 21000,
    demandMw: 5.4,
  },
  {
    id: "SUB-04",
    name: "Meridian Substation",
    type: "Substation",
    status: "damaged",
    damageSeverity: "Severe",
    estimatedRepairHours: 6,
    // Asset-level demand figure for display/context only — see
    // mockServiceAreas for the non-overlapping figure used in Overview totals.
    demandMw: 6.2,
    assignedCrewId: "CREW-BRAVO",
    criticalFacility: "Regional Medical Center (Hospital)",
  },
  {
    id: "SUB-02",
    name: "Eastline Substation",
    type: "Substation",
    status: "damaged",
    damageSeverity: "Severe",
    estimatedRepairHours: 5,
    populationServed: 9800,
    demandMw: 3.1,
    criticalFacility: "Regional Communications Tower",
  },
  {
    id: "FEEDER-03",
    name: "Hospital Distribution Feeder",
    type: "Distribution Feeder",
    status: "damaged",
    damageSeverity: "Minor",
    estimatedRepairHours: 2,
    // Asset-level population figure for display/context only — see
    // mockServiceAreas for the non-overlapping figure used in Overview totals.
    populationServed: 18400,
    demandMw: 1.1,
    criticalFacility: "Regional Medical Center (Hospital)",
  },
  {
    id: "FAC-HOSPITAL",
    name: "Regional Medical Center",
    type: "Critical Facility — Hospital",
    status: "critical",
  },
  {
    id: "FAC-WATER",
    name: "Westside Water Pumping Station",
    type: "Critical Facility — Water",
    status: "damaged",
  },
  {
    id: "FAC-EOC",
    name: "Emergency Operations Center",
    type: "Critical Facility — EOC",
    status: "operational",
  },
  {
    id: "FAC-COMMS",
    name: "Regional Communications Tower",
    type: "Critical Facility — Comms",
    status: "damaged",
  },
];

export const mockCriticalFacilities: CriticalFacility[] = [
  {
    id: "CF-HOSPITAL",
    name: "Regional Medical Center",
    type: "Hospital",
    assetId: "FAC-HOSPITAL",
    status: "offline",
  },
  {
    id: "CF-WATER",
    name: "Westside Water Pumping Station",
    type: "Water",
    assetId: "FAC-WATER",
    status: "dependency_blocked",
  },
  {
    id: "CF-EOC",
    name: "Emergency Operations Center",
    type: "EOC",
    assetId: "FAC-EOC",
    status: "online",
  },
  {
    id: "CF-COMMS",
    name: "Regional Communications Tower",
    type: "Communications",
    assetId: "FAC-COMMS",
    status: "at_risk",
  },
];

export const mockDependencies: Dependency[] = [
  { id: "DEP-1", upstreamAssetId: "GEN-01", downstreamAssetId: "LINE-05", type: "feeds" },
  { id: "DEP-2", upstreamAssetId: "LINE-05", downstreamAssetId: "SUB-04", type: "feeds" },
  { id: "DEP-3", upstreamAssetId: "SUB-04", downstreamAssetId: "FEEDER-03", type: "feeds" },
  { id: "DEP-4", upstreamAssetId: "FEEDER-03", downstreamAssetId: "FAC-HOSPITAL", type: "feeds" },
  { id: "DEP-5", upstreamAssetId: "GEN-01", downstreamAssetId: "LINE-12", type: "feeds" },
  { id: "DEP-6", upstreamAssetId: "LINE-12", downstreamAssetId: "SUB-02", type: "feeds" },
  { id: "DEP-7", upstreamAssetId: "SUB-02", downstreamAssetId: "FAC-COMMS", type: "feeds" },
];

// Non-overlapping simulated population/demand zones. These are authored
// directly (not derived from GridAsset topology) so Overview regional
// totals never double count the same simulated customers. See ServiceArea
// in types/grid.ts.
export const mockServiceAreas: ServiceArea[] = [
  {
    id: "AREA-MERIDIAN",
    name: "Meridian Service Area",
    population: 18400,
    demandMw: 6.2,
    status: "offline",
    suppliedByAssetId: "SUB-04",
  },
  {
    id: "AREA-EASTLINE",
    name: "Eastline Service Area",
    population: 9800,
    demandMw: 3.1,
    status: "offline",
    suppliedByAssetId: "SUB-02",
  },
];

export const mockCrews: RepairCrew[] = [
  { id: "CREW-ALPHA", name: "Crew Alpha", status: "available" },
  { id: "CREW-BRAVO", name: "Crew Bravo", status: "assigned", assignedAssetId: "SUB-04" },
  { id: "CREW-CHARLIE", name: "Crew Charlie", status: "available" },
];

export const mockBaselineScenario: RestorationScenario = {
  id: "baseline",
  name: "Baseline",
  availableCrews: 3,
  generationCapacityMw: 60,
};
