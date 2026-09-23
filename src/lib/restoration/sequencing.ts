import { scoreRestorationCandidates, type ScoredAsset, type ScoringInput } from "./scoring.ts";

/**
 * Dependency-aware restoration sequencing (prototype planning logic).
 * See docs/sequencing-model.md. Priority score (importance) is computed by
 * scoring.ts and is never changed here; recommendedSequence (feasible order) is
 * decided here. Not power-flow validation or a utility switching procedure.
 */

export interface SequencedRestoration {
  assetId: string;
  /** Unchanged score from the scoring engine: how important the asset is. */
  priorityScore: number;
  /** 1-based, unique, contiguous: when the asset can feasibly be restored. */
  recommendedSequence: number;
  estimatedRepairHours: number | null;
  /** Candidate assets (transitively upstream) that must be restored before this one. */
  upstreamRequiredAssetIds: string[];
  sequencingReason: string;
  /** Full scoring result (factor breakdown) this entry was built from. */
  scored: ScoredAsset;
}

/** Thrown when candidates can never become feasible (dependency cycle or blocked by one). */
export class SequencingDeadlockError extends Error {
  readonly unresolvedAssetIds: string[];
  constructor(unresolvedAssetIds: string[]) {
    super(`Restoration sequencing deadlock: unresolved assets ${unresolvedAssetIds.join(", ")}`);
    this.name = "SequencingDeadlockError";
    this.unresolvedAssetIds = unresolvedAssetIds;
  }
}

export function sequenceRestoration(input: ScoringInput): SequencedRestoration[] {
  // Scoring validates dependency endpoints (throws on unknown assets) and defines eligibility.
  const scored = scoreRestorationCandidates(input);
  if (scored.length === 0) return [];

  const candidateIds = new Set(scored.map((s) => s.assetId));
  const hoursById = new Map(input.assets.map((a) => [a.id, a.estimatedRepairHours ?? null]));

  const upstreamOf = new Map<string, string[]>();
  for (const dep of input.dependencies) {
    const list = upstreamOf.get(dep.downstreamAssetId) ?? [];
    list.push(dep.upstreamAssetId);
    upstreamOf.set(dep.downstreamAssetId, list);
  }

  // Candidate ancestors, found by walking upstream through any asset (operational assets never
  // block themselves, but damage further upstream still does). A candidate in a cycle lists itself.
  const requiredFor = (id: string): string[] => {
    const seen = new Set<string>();
    const stack = [...(upstreamOf.get(id) ?? [])];
    while (stack.length > 0) {
      const next = stack.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...(upstreamOf.get(next) ?? []));
    }
    return [...seen].filter((a) => candidateIds.has(a)).sort();
  };
  const required = new Map(scored.map((s) => [s.assetId, requiredFor(s.assetId)]));

  const hours = (id: string) => hoursById.get(id) ?? Number.POSITIVE_INFINITY;
  const byPreference = (a: ScoredAsset, b: ScoredAsset) =>
    b.totalScore - a.totalScore || hours(a.assetId) - hours(b.assetId) || a.assetId.localeCompare(b.assetId);

  const done = new Set<string>();
  const remaining = [...scored];
  const result: SequencedRestoration[] = [];

  while (remaining.length > 0) {
    const feasible = remaining
      .filter((s) => required.get(s.assetId)!.every((id) => done.has(id)))
      .sort(byPreference);
    if (feasible.length === 0) {
      throw new SequencingDeadlockError(remaining.map((s) => s.assetId).sort());
    }
    const pick = feasible[0];
    const waiting = remaining
      .filter((s) => s !== pick && !feasible.includes(s) && s.totalScore > pick.totalScore)
      .map((s) => s.assetId)
      .sort();
    const upstream = required.get(pick.assetId)!;

    const parts = [
      upstream.length > 0
        ? `Selected after ${upstream.join(", ")} because ${upstream.length > 1 ? "they are" : "it is"} upstream of ${pick.assetId}.`
        : `No damaged upstream dependency; ${pick.assetId} can be restored immediately.`,
      `Among ${feasible.length} currently feasible asset(s), it ranked first by priority score (${pick.totalScore}), then shorter repair time, then asset ID.`,
    ];
    if (waiting.length > 0) {
      parts.push(`Higher-scoring ${waiting.join(", ")} still waiting on upstream restoration.`);
    }

    result.push({
      assetId: pick.assetId,
      priorityScore: pick.totalScore,
      recommendedSequence: result.length + 1,
      estimatedRepairHours: hoursById.get(pick.assetId) ?? null,
      upstreamRequiredAssetIds: upstream,
      sequencingReason: parts.join(" "),
      scored: pick,
    });
    done.add(pick.assetId);
    remaining.splice(remaining.indexOf(pick), 1);
  }

  return result;
}
