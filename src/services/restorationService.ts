import {
  mockAssets,
  mockBaselineScenario,
  mockCrews,
  mockCriticalFacilities,
  mockDependencies,
  mockServiceAreas,
} from "@/data/mockGridData";
import type {
  CriticalFacility,
  Dependency,
  GridAsset,
  RepairCrew,
  RestorationRecommendation,
  RestorationScenario,
  ScenarioResult,
  ServiceArea,
} from "@/types/grid";
import type {
  CriticalFacilityOverview,
  OverviewMetric,
  OverviewSummary,
  PriorityPreviewItem,
} from "@/types/overview";
import type { InfrastructureNetwork, NetworkEdge, NetworkNode } from "@/types/infrastructure";
import type { RestorationPlanItem } from "@/types/restorationPlan";
import type { ScoredAsset, ScoringInput } from "@/lib/restoration/scoring";
import { evaluateScenario } from "@/lib/restoration/scenario";
import { sequenceRestoration } from "@/lib/restoration/sequencing";

// Frontend service boundary: UI reads through these functions rather than
// touching mock data directly. Each call returns a Promise so a future API
// client can replace the mock implementations below without changing callers.

export function getAssets(): Promise<GridAsset[]> {
  return Promise.resolve(mockAssets);
}

export function getCriticalFacilities(): Promise<CriticalFacility[]> {
  return Promise.resolve(mockCriticalFacilities);
}

export function getDependencies(): Promise<Dependency[]> {
  return Promise.resolve(mockDependencies);
}

export function getCrews(): Promise<RepairCrew[]> {
  return Promise.resolve(mockCrews);
}

/**
 * Single source of recommendations: scores come from the scoring engine and
 * recommendedSequence from the dependency-aware sequencing engine.
 */
function buildRecommendations(): { rec: RestorationRecommendation; scored: ScoredAsset }[] {
  const sequenced = sequenceRestoration({
    assets: mockAssets,
    dependencies: mockDependencies,
    criticalFacilities: mockCriticalFacilities,
    crews: mockCrews,
    serviceAreas: mockServiceAreas,
  });
  return sequenced.map((s) => {
    const top = [...s.scored.factors].sort((a, b) => b.contribution - a.contribution)[0];
    return {
      scored: s.scored,
      rec: {
        assetId: s.assetId,
        priorityScore: s.priorityScore,
        recommendedSequence: s.recommendedSequence,
        explanation: `${s.sequencingReason} Largest score contributor: ${top.factor}.`,
      },
    };
  });
}

export function getRecommendations(): Promise<RestorationRecommendation[]> {
  return Promise.resolve(buildRecommendations().map((r) => r.rec));
}

export function getScenario(): Promise<RestorationScenario> {
  return Promise.resolve(mockBaselineScenario);
}

function scenarioInput(): ScoringInput {
  return {
    assets: mockAssets,
    dependencies: mockDependencies,
    criticalFacilities: mockCriticalFacilities,
    crews: mockCrews,
    serviceAreas: mockServiceAreas,
  };
}

/** Runs the deterministic scenario evaluator (scoring -> sequencing) on the baseline dataset. */
export function getScenarioResult(scenario: RestorationScenario): Promise<ScenarioResult> {
  return Promise.resolve(evaluateScenario(scenarioInput(), scenario));
}

/** Data the Scenario page needs to re-evaluate scenarios in the browser with the same engines. */
export function getScenarioWorkspaceData(): Promise<{
  input: ScoringInput;
  baseline: RestorationScenario;
  assets: GridAsset[];
}> {
  return Promise.resolve({ input: scenarioInput(), baseline: mockBaselineScenario, assets: mockAssets });
}

export function getServiceAreas(): Promise<ServiceArea[]> {
  return Promise.resolve(mockServiceAreas);
}

// Tiered layout columns for the Infrastructure schematic. Critical facility
// assets always sit in the final tier, appended after this list.
const NETWORK_TIER_TYPES = ["Generation", "Transmission Line", "Substation", "Distribution Feeder"];

function tierForAsset(asset: GridAsset): number {
  if (isFacilityAsset(asset)) return NETWORK_TIER_TYPES.length;
  const index = NETWORK_TIER_TYPES.indexOf(asset.type);
  return index === -1 ? NETWORK_TIER_TYPES.length - 1 : index;
}

/** Direct upstream/downstream asset ids for an asset, derived from mockDependencies. */
function upstreamAssetIdsFor(assetId: string): string[] {
  return mockDependencies.filter((dep) => dep.downstreamAssetId === assetId).map((dep) => dep.upstreamAssetId);
}

function downstreamAssetIdsFor(assetId: string): string[] {
  return mockDependencies.filter((dep) => dep.upstreamAssetId === assetId).map((dep) => dep.downstreamAssetId);
}

/**
 * Builds the Infrastructure page's network view model: a simple tiered
 * layout position plus immediate upstream/downstream asset ids per node,
 * derived directly from mockDependencies so the page never has to re-derive
 * the dependency graph itself.
 */
export function getInfrastructureNetwork(): Promise<InfrastructureNetwork> {
  const rowCounters = new Map<number, number>();
  const nodes: NetworkNode[] = mockAssets.map((asset) => {
    const tier = tierForAsset(asset);
    const row = rowCounters.get(tier) ?? 0;
    rowCounters.set(tier, row + 1);
    return {
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      tier,
      row,
      isCriticalFacility: isFacilityAsset(asset),
      criticalFacility: asset.criticalFacility ?? null,
      upstreamAssetIds: upstreamAssetIdsFor(asset.id),
      downstreamAssetIds: downstreamAssetIdsFor(asset.id),
    };
  });

  const edges: NetworkEdge[] = mockDependencies.map((dep) => ({
    id: dep.id,
    fromAssetId: dep.upstreamAssetId,
    toAssetId: dep.downstreamAssetId,
  }));

  return Promise.resolve({ nodes, edges, tierCount: NETWORK_TIER_TYPES.length + 1 });
}

/**
 * Builds the Restoration Plan page's ranked queue view model: each mock
 * recommendation (from the deterministic scoring engine) joined with its
 * asset, assigned crew, direct dependency context, and factor breakdown,
 * sorted by recommended sequence.
 */
export function getRestorationPlan(): Promise<RestorationPlanItem[]> {
  const assetById = new Map(mockAssets.map((a) => [a.id, a]));
  const crewById = new Map(mockCrews.map((c) => [c.id, c]));

  const items: RestorationPlanItem[] = buildRecommendations()
    .flatMap(({ rec, scored }) => {
      const asset = assetById.get(rec.assetId);
      if (!asset) return [];
      return [
        {
          assetId: rec.assetId,
          asset,
          recommendedSequence: rec.recommendedSequence,
          priorityScore: rec.priorityScore,
          explanation: rec.explanation,
          priorityFactors: scored.factors.map((f) => ({
            label: f.factor,
            contribution: f.contribution,
            maxContribution: f.maxContribution,
            explanation: f.explanation,
          })),
          assignedCrew: asset.assignedCrewId ? (crewById.get(asset.assignedCrewId) ?? null) : null,
          upstream: upstreamAssetIdsFor(rec.assetId)
            .map((id) => assetById.get(id))
            .filter((a): a is GridAsset => a != null),
          downstream: downstreamAssetIdsFor(rec.assetId)
            .map((id) => assetById.get(id))
            .filter((a): a is GridAsset => a != null),
        },
      ];
    });

  return Promise.resolve(items);
}

function isFacilityAsset(asset: GridAsset): boolean {
  return asset.type.startsWith("Critical Facility");
}

/** Broad "affected" concept used for Grid Status: anything not fully operational. */
function isImpacted(asset: GridAsset): boolean {
  return asset.status === "damaged" || asset.status === "repair";
}

/** Narrower concept for the "Damaged Assets" card, matching its label exactly. */
function isDamaged(asset: GridAsset): boolean {
  return asset.status === "damaged";
}

/**
 * Aggregates the small mock dataset into the shapes the Overview page
 * renders directly, so the page component stays a thin view over the
 * service boundary instead of re-deriving these numbers itself.
 *
 * Two distinct kinds of population/demand data are in play here:
 * - Asset-level (GridAsset.populationServed/demandMw): contextual figures
 *   for engineering/display purposes. They may overlap along a dependency
 *   chain and must NOT be summed for a regional total.
 * - Service-area-level (ServiceArea.population/demandMw): authored to be
 *   non-overlapping, and are the only authoritative source for the
 *   Overview's "Population Without Power" / "Estimated Demand Offline"
 *   totals below.
 */
export function getOverviewSummary(): Promise<OverviewSummary> {
  const nonFacilityAssets = mockAssets.filter((a) => !isFacilityAsset(a));
  const impactedNonFacility = nonFacilityAssets.filter(isImpacted);
  const damagedNonFacility = nonFacilityAssets.filter(isDamaged);
  const offlineFacilities = mockCriticalFacilities.filter(
    (f) => f.status === "offline" || f.status === "dependency_blocked",
  );
  const availableCrews = mockCrews.filter((c) => c.status === "available");

  const offlineServiceAreas = mockServiceAreas.filter((area) => area.status === "offline");
  const populationWithoutPower = offlineServiceAreas.reduce((sum, area) => sum + area.population, 0);
  const demandOfflineMw = offlineServiceAreas.reduce((sum, area) => sum + area.demandMw, 0);

  const metrics: OverviewMetric[] = [
    {
      label: "Grid Status",
      value: impactedNonFacility.length > 0 ? "Degraded" : "Normal",
      sub: `${impactedNonFacility.length} of ${nonFacilityAssets.length} grid assets affected`,
      tone: impactedNonFacility.length > 0 ? "warning" : "positive",
    },
    {
      label: "Damaged Assets",
      value: String(damagedNonFacility.length),
      sub: "Across substations, lines & feeders",
      tone: "warning",
    },
    {
      label: "Critical Facilities Offline",
      value: `${offlineFacilities.length} / ${mockCriticalFacilities.length}`,
      sub: "Hospital, water & communications impact",
      tone: "critical",
    },
    {
      label: "Available Repair Crews",
      value: `${availableCrews.length} of ${mockCrews.length}`,
      sub: "Simulated crew roster",
      tone: "neutral",
    },
    {
      label: "Population Without Power",
      value: populationWithoutPower.toLocaleString("en-US"),
      sub: "Simulated regional estimate",
      tone: "neutral",
    },
    {
      label: "Estimated Demand Offline",
      value: `${demandOfflineMw.toFixed(1)} MW`,
      sub: "Simulated aggregate demand",
      tone: "neutral",
    },
  ];

  const assetById = new Map(mockAssets.map((a) => [a.id, a]));
  const topPriorities: PriorityPreviewItem[] = buildRecommendations()
    .map(({ rec }) => rec)
    .slice(0, 4)
    .map((rec) => {
      const asset = assetById.get(rec.assetId);
      return {
        assetId: rec.assetId,
        assetName: asset?.name ?? rec.assetId,
        assetType: asset?.type ?? "Unknown",
        sequence: rec.recommendedSequence,
        priorityScore: rec.priorityScore,
        estimatedRepairHours: asset?.estimatedRepairHours ?? null,
        criticalFacility: asset?.criticalFacility ?? null,
      };
    });

  const criticalFacilities: CriticalFacilityOverview[] = mockCriticalFacilities.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    status: f.status,
  }));

  const contextNote =
    "Severe simulated infrastructure damage has interrupted service across the regional network. " +
    "Restoration planning currently prioritizes critical facilities, population impact, and infrastructure " +
    "dependencies. All data on this page is simulated prototype data.";

  return Promise.resolve({ metrics, topPriorities, criticalFacilities, contextNote });
}
