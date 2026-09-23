import type { AssetStatus, CriticalFacility, Dependency, GridAsset, RepairCrew, ServiceArea } from "../../types/grid";

/**
 * Deterministic restoration-priority scoring (prototype decision-support).
 * See docs/scoring-model.md. Pure functions: no randomness, no clock, no I/O,
 * and inputs are never mutated. Not a validated utility restoration standard.
 *
 * priority = sum over factors of (weight x normalized value in [0,1]); weights sum to 100.
 */

export const SCORING_WEIGHTS = {
  criticalFacility: 30,
  population: 25,
  dependency: 20,
  repairFeasibility: 15,
  resourceAvailability: 10,
} as const;

/** Repair durations at or beyond this get zero feasibility contribution. */
export const MAX_REPAIR_HOURS = 24;

/** Crew factor: crew assigned/en-route to the asset, or only an unassigned available crew. */
export const CREW_ASSIGNED_VALUE = 1;
export const CREW_AVAILABLE_VALUE = 0.5;

/** Statuses eligible for restoration scoring. Facility assets (consumers) are never scored. */
export const ELIGIBLE_STATUSES: readonly AssetStatus[] = ["damaged", "repair"];

/** Statuses that mean an upstream asset cannot currently pass service through. */
const UNAVAILABLE_STATUSES: readonly AssetStatus[] = ["damaged", "critical", "repair"];

export interface ScoringInput {
  assets: readonly GridAsset[];
  dependencies: readonly Dependency[];
  criticalFacilities: readonly CriticalFacility[];
  crews: readonly RepairCrew[];
  /** Optional: supplies population for assets with no asset-level populationServed. */
  serviceAreas?: readonly ServiceArea[];
}

export interface FactorScore {
  factor: string;
  contribution: number;
  maxContribution: number;
  explanation: string;
}

export interface ScoredAsset {
  assetId: string;
  /** 0-100, one decimal. Equals the sum of factor contributions exactly. */
  totalScore: number;
  factors: FactorScore[];
  /** Direct upstream asset ids (from Dependency records). */
  upstreamAssetIds: string[];
  /** Direct upstream assets that are damaged/under repair/critical. */
  blockingUpstreamAssetIds: string[];
  /** True if a direct upstream asset must be restored before this asset can deliver service. */
  requiresUpstreamRestoration: boolean;
}

export function isFacilityAsset(asset: GridAsset): boolean {
  return asset.type.startsWith("Critical Facility");
}

export function isEligibleForRestoration(asset: GridAsset): boolean {
  return !isFacilityAsset(asset) && ELIGIBLE_STATUSES.includes(asset.status);
}

/** Round to tenths via integers so contributions sum exactly to the total. */
function toTenths(value: number): number {
  return Math.round(value * 10);
}

function ratio(value: number, max: number): number {
  return max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Only finite, nonnegative numbers are usable population values; anything else counts as 0. */
function usablePopulation(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/** Dependencies must reference supplied assets; a broken record would silently distort scores. */
function assertDependenciesResolve(assetIds: Set<string>, dependencies: readonly Dependency[]): void {
  for (const dep of dependencies) {
    if (!assetIds.has(dep.upstreamAssetId)) {
      throw new Error(`Invalid dependency ${dep.id}: upstream asset "${dep.upstreamAssetId}" not found`);
    }
    if (!assetIds.has(dep.downstreamAssetId)) {
      throw new Error(`Invalid dependency ${dep.id}: downstream asset "${dep.downstreamAssetId}" not found`);
    }
  }
}

export function scoreRestorationCandidates(input: ScoringInput): ScoredAsset[] {
  const { assets, dependencies, criticalFacilities, crews, serviceAreas = [] } = input;
  const assetById = new Map(assets.map((a) => [a.id, a]));
  assertDependenciesResolve(new Set(assetById.keys()), dependencies);
  const candidates = assets.filter(isEligibleForRestoration);
  if (candidates.length === 0) return [];

  const upstreamOf = (id: string) =>
    dependencies.filter((d) => d.downstreamAssetId === id).map((d) => d.upstreamAssetId);
  const downstreamOf = (id: string) =>
    dependencies.filter((d) => d.upstreamAssetId === id).map((d) => d.downstreamAssetId);

  // Population: asset-level figure if present, else simulated service areas supplied by the asset.
  // Non-finite or negative values are treated as 0 (also for the aggregated area total).
  const populationOf = (a: GridAsset): number =>
    a.populationServed != null
      ? usablePopulation(a.populationServed)
      : usablePopulation(
          serviceAreas
            .filter((s) => s.suppliedByAssetId === a.id)
            .reduce((sum, s) => sum + usablePopulation(s.population), 0),
        );

  // Facilities still needing service (not online) that the asset feeds: a direct downstream
  // dependency into a facility's asset, or an exact (case/space-insensitive) match of the asset's
  // criticalFacility label to "<name>" or the dataset's "<name> (<type>)" format. No prefix matching.
  const facilitiesFor = (a: GridAsset): CriticalFacility[] => {
    const downstream = new Set(downstreamOf(a.id));
    const label = normalizeName(a.criticalFacility ?? "");
    return criticalFacilities.filter(
      (f) =>
        f.status !== "online" &&
        (downstream.has(f.assetId) ||
          (label !== "" &&
            (label === normalizeName(f.name) || label === normalizeName(`${f.name} (${f.type})`)))),
    );
  };

  const facilityCounts = new Map(candidates.map((a) => [a.id, facilitiesFor(a).length]));
  const maxFacilities = Math.max(...facilityCounts.values());
  const maxPopulation = Math.max(...candidates.map(populationOf));
  const downstreamCounts = new Map(candidates.map((a) => [a.id, downstreamOf(a.id).length]));
  const maxDownstream = Math.max(...downstreamCounts.values());
  // Full credit: a crew with status assigned/en_route explicitly assigned to this asset.
  // Partial credit: some available crew with no assignment. A crew tied to another asset never counts.
  const anyAvailableCrew = crews.some((c) => c.status === "available" && c.assignedAssetId == null);
  const W = SCORING_WEIGHTS;

  const scored = candidates.map((asset): ScoredAsset => {
    const facilities = facilitiesFor(asset);
    const population = populationOf(asset);
    const downstreamCount = downstreamCounts.get(asset.id) ?? 0;
    const hours = asset.estimatedRepairHours;
    const crewAssigned = crews.some(
      (c) =>
        (c.status === "assigned" || c.status === "en_route") &&
        (c.assignedAssetId === asset.id ||
          (c.id === asset.assignedCrewId && (c.assignedAssetId == null || c.assignedAssetId === asset.id))),
    );

    const facilityNorm = ratio(facilities.length, maxFacilities);
    const populationNorm = ratio(population, maxPopulation);
    const dependencyNorm = ratio(downstreamCount, maxDownstream);
    const feasibilityNorm = hours != null && hours >= 0 ? 1 - ratio(hours, MAX_REPAIR_HOURS) : 0;
    const crewNorm = crewAssigned ? CREW_ASSIGNED_VALUE : anyAvailableCrew ? CREW_AVAILABLE_VALUE : 0;

    const factor = (name: string, weight: number, norm: number, explanation: string) => ({
      factor: name,
      tenths: toTenths(weight * norm),
      maxContribution: weight,
      explanation,
    });

    const raw = [
      factor(
        "Critical Facility Impact",
        W.criticalFacility,
        facilityNorm,
        facilities.length > 0
          ? `Feeds ${facilities.length} critical facility(ies) not yet online (${facilities.map((f) => f.name).join(", ")}); max among candidates is ${maxFacilities}.`
          : "No linked critical facility awaiting service.",
      ),
      factor(
        "Population Impact",
        W.population,
        populationNorm,
        population > 0
          ? `${fmt(population)} simulated residents served, ${fmt(populationNorm * 100)}% of the largest candidate (${fmt(maxPopulation)}).`
          : "No population figure recorded; contributes 0.",
      ),
      factor(
        "Dependency Impact",
        W.dependency,
        dependencyNorm,
        `${downstreamCount} direct downstream asset(s); max among candidates is ${maxDownstream}.`,
      ),
      factor(
        "Repair Feasibility",
        W.repairFeasibility,
        feasibilityNorm,
        hours != null && hours >= 0
          ? `Estimated ${fmt(hours)} h repair; contribution = 1 - hours/${MAX_REPAIR_HOURS} (shorter is higher).`
          : "No repair estimate recorded; contributes 0.",
      ),
      factor(
        "Resource Availability",
        W.resourceAvailability,
        crewNorm,
        crewAssigned
          ? "A crew is assigned to this asset."
          : anyAvailableCrew
            ? "No crew assigned, but an unassigned crew is available (half credit)."
            : "No crew assigned or available.",
      ),
    ];

    const totalTenths = raw.reduce((sum, f) => sum + f.tenths, 0);
    const upstreamAssetIds = [...new Set(upstreamOf(asset.id))];
    const blocking = upstreamAssetIds.filter((id) => {
      const up = assetById.get(id);
      return up != null && UNAVAILABLE_STATUSES.includes(up.status);
    });

    return {
      assetId: asset.id,
      totalScore: totalTenths / 10,
      factors: raw.map(({ tenths, ...f }) => ({ ...f, contribution: tenths / 10 })),
      upstreamAssetIds,
      blockingUpstreamAssetIds: blocking,
      requiresUpstreamRestoration: blocking.length > 0,
    };
  });

  // Highest score first; ties broken by asset id for a stable order.
  return scored.sort((a, b) => b.totalScore - a.totalScore || a.assetId.localeCompare(b.assetId));
}
