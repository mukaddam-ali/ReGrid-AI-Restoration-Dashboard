import type { RepairCrew, RestorationScenario, ScenarioChange, ScenarioResult } from "../../types/grid";
import type { ScoringInput } from "./scoring.ts";
import { sequenceRestoration, type SequencedRestoration } from "./sequencing.ts";

/**
 * Scenario evaluation (prototype). Builds scenario-specific planning data, then runs the
 * accepted scoring and sequencing engines unchanged. See docs/scenario-model.md.
 * No power flow, dispatch, switching, crew travel or field-safety validation.
 */

const EPSILON = 1e-9;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Crew-count rule: order crews with assigned/en_route first (they are already committed),
 * then available crews, each group by ascending crew ID; keep the first `count`.
 * Reducing the count therefore removes unassigned crews with the highest IDs first, and
 * only then assigned crews.
 */
export function selectScenarioCrews(
  crews: readonly RepairCrew[],
  count: number,
): { kept: RepairCrew[]; removed: RepairCrew[] } {
  const rank = (c: RepairCrew) => (c.status === "available" ? 1 : 0);
  const ordered = [...crews].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  return { kept: ordered.slice(0, count), removed: ordered.slice(count) };
}

function validateScenario(scenario: RestorationScenario, crewTotal: number): void {
  const crews = scenario.availableCrews;
  if (!Number.isInteger(crews) || crews < 0 || crews > crewTotal) {
    throw new Error(`Invalid availableCrews ${crews}: must be an integer from 0 to ${crewTotal}`);
  }
  const mw = scenario.generationCapacityMw;
  if (!Number.isFinite(mw) || mw < 0) {
    throw new Error(`Invalid generationCapacityMw ${mw}: must be a finite number >= 0`);
  }
}

/**
 * Greedy planning estimate. Repeatedly takes the earliest-free crew and starts the asset that can
 * begin earliest (ties: earlier recommended sequence), never before its required upstream assets finish.
 */
function estimatePlanDuration(plan: readonly SequencedRestoration[], crewCount: number): number | null {
  if (plan.length === 0) return 0;
  if (crewCount === 0) return null;
  const free = new Array<number>(crewCount).fill(0);
  const finish = new Map<string, number>();
  const remaining = [...plan];
  while (remaining.length > 0) {
    const crewIndex = free.indexOf(Math.min(...free));
    let best = -1;
    let bestStart = Infinity;
    remaining.forEach((r, i) => {
      if (!r.upstreamRequiredAssetIds.every((id) => finish.has(id))) return;
      const start = Math.max(free[crewIndex], ...r.upstreamRequiredAssetIds.map((id) => finish.get(id)!));
      if (start < bestStart - EPSILON) {
        best = i;
        bestStart = start;
      }
    });
    const [picked] = remaining.splice(best, 1);
    const end = bestStart + (picked.estimatedRepairHours ?? 0);
    free[crewIndex] = end;
    finish.set(picked.assetId, end);
  }
  return round1(Math.max(...finish.values()));
}

export function evaluateScenario(input: ScoringInput, scenario: RestorationScenario): ScenarioResult {
  validateScenario(scenario, input.crews.length);
  const { kept, removed } = selectScenarioCrews(input.crews, scenario.availableCrews);
  const plan = sequenceRestoration({ ...input, crews: kept });
  // Missing (null/undefined) hours keep the documented policy (count as 0); present values must be finite and >= 0.
  for (const step of plan) {
    const hours = step.estimatedRepairHours;
    if (hours != null && !(Number.isFinite(hours) && hours >= 0)) {
      throw new Error(`Invalid estimatedRepairHours ${hours} for asset ${step.assetId}: must be a finite number >= 0`);
    }
  }

  // Capacity screening: walk the sequence; an offline service area is "served" if its demand
  // still fits in the remaining aggregate capacity, otherwise it is reported unserved.
  let remainingMw = scenario.generationCapacityMw;
  let demandServed = 0;
  let demandUnserved = 0;
  let populationServed = 0;
  let populationUnserved = 0;
  const unserved: string[] = [];
  const areas = input.serviceAreas ?? [];
  for (const step of plan) {
    for (const area of areas.filter((a) => a.suppliedByAssetId === step.assetId && a.status === "offline")) {
      const demand = Number.isFinite(area.demandMw) && area.demandMw >= 0 ? area.demandMw : 0;
      const population = Number.isFinite(area.population) && area.population >= 0 ? area.population : 0;
      if (demand <= remainingMw + EPSILON) {
        remainingMw -= demand;
        demandServed += demand;
        populationServed += population;
      } else {
        demandUnserved += demand;
        populationUnserved += population;
        unserved.push(area.id);
      }
    }
  }

  return {
    scenarioId: scenario.id,
    scenario,
    recommendations: plan.map((p) => ({
      assetId: p.assetId,
      priorityScore: p.priorityScore,
      recommendedSequence: p.recommendedSequence,
      explanation: p.sequencingReason,
    })),
    metrics: {
      availableCrews: scenario.availableCrews,
      totalRepairWorkHours: round1(plan.reduce((sum, p) => sum + (p.estimatedRepairHours ?? 0), 0)),
      estimatedPlanDurationHours: estimatePlanDuration(plan, kept.length),
      generationCapacityMw: scenario.generationCapacityMw,
      demandServedMw: round1(demandServed),
      demandUnservedMw: round1(demandUnserved),
      populationServed,
      populationUnserved,
      unservedServiceAreaIds: unserved,
    },
    factorContributions: Object.fromEntries(
      plan.map((p) => [p.assetId, p.scored.factors.map((f) => ({ factor: f.factor, contribution: f.contribution }))]),
    ),
    crewIds: kept.map((c) => c.id),
    removedCrewIds: removed.map((c) => c.id),
  };
}

/**
 * Per-asset differences between two evaluated scenarios. Explanations only state what the
 * calculation shows (position and score change, plus the exact factor contributions that differ).
 */
export function compareScenarios(baseline: ScenarioResult, modified: ScenarioResult): ScenarioChange[] {
  const baseById = new Map(baseline.recommendations.map((r) => [r.assetId, r]));
  const changes: ScenarioChange[] = [];
  for (const mod of modified.recommendations) {
    const base = baseById.get(mod.assetId);
    if (!base) continue;
    const before = baseline.factorContributions[mod.assetId] ?? [];
    const after = modified.factorContributions[mod.assetId] ?? [];
    const changedFactors = after
      .map((f) => ({
        factor: f.factor,
        from: before.find((b) => b.factor === f.factor)?.contribution ?? 0,
        to: f.contribution,
      }))
      .filter((f) => f.from !== f.to);
    const positionChanged = base.recommendedSequence !== mod.recommendedSequence;
    const scoreChanged = base.priorityScore !== mod.priorityScore;
    let explanation = "No change under the modified scenario.";
    if (positionChanged) {
      explanation = `${mod.assetId} moved from #${base.recommendedSequence} to #${mod.recommendedSequence} after recalculating priority and dependency order under the modified scenario.`;
    } else if (scoreChanged) {
      explanation = `${mod.assetId} keeps sequence #${mod.recommendedSequence}; priority score changed from ${base.priorityScore} to ${mod.priorityScore}.`;
    }
    if (scoreChanged && changedFactors.length > 0) {
      explanation += ` Changed factors: ${changedFactors.map((f) => `${f.factor} ${f.from} → ${f.to}`).join("; ")}.`;
    }
    changes.push({
      assetId: mod.assetId,
      baselineSequence: base.recommendedSequence,
      modifiedSequence: mod.recommendedSequence,
      baselineScore: base.priorityScore,
      modifiedScore: mod.priorityScore,
      changedFactors,
      positionChanged,
      scoreChanged,
      explanation,
    });
  }
  return changes;
}
