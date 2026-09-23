# ReGrid AI — Restoration Sequencing Model (v1)

> **Dependency-aware restoration planning on simulated prototype data. Not power-flow validation, not a utility switching procedure, not a claim of safe energization or global optimality.** AI recommends. Engineers decide.

Implementation: `src/lib/restoration/sequencing.ts` (tests: `sequencing.test.ts`, `npm test`).

## Purpose

Turn the scored damaged assets into a feasible restoration order that respects upstream dependencies.

## Priority vs. sequence

- **Priority score** (`priorityScore`, from `scoring.ts`): how important an asset is. Sequencing never changes it.
- **Recommended sequence** (`recommendedSequence`): when the asset can feasibly be restored given dependencies. A lower-priority upstream asset can precede a higher-priority downstream one.

## Algorithm

1. Candidates are the assets the scoring engine scores (damaged/under-repair, non-facility). Critical-facility assets are consumers and are never sequenced.
2. Each candidate's required set is every candidate reachable by walking upstream through `Dependency` records (through operational assets too, so damage further upstream still counts). Operational upstream assets are not candidates and never block.
3. Repeat: among candidates whose required set is fully sequenced ("feasible"), pick the best by the tie-break rule, assign the next sequence number, mark it done.
4. Stop when all candidates are sequenced.

## Tie-breaking

1. Higher priority score
2. Shorter estimated repair hours (missing hours sort last)
3. Lexicographically smaller asset ID

## Errors

- Dependency endpoints are validated by the scoring engine; an unknown asset throws (`Invalid dependency <id>: ...`). There is one validator.
- If candidates remain but none is feasible (a dependency cycle, or an asset downstream of one), a `SequencingDeadlockError` is thrown listing the unresolved asset IDs. No partial sequence is returned.

## Output

Per asset: `assetId`, `priorityScore`, `recommendedSequence` (unique, 1..n), `estimatedRepairHours`, `upstreamRequiredAssetIds`, a deterministic `sequencingReason`, and the full scoring result.

## Limitations

- Crews are not scheduled: no parallel repair, crew counts or travel time (crew availability only affects the score).
- Repair duration only breaks ties; the plan does not minimise total or weighted outage time.
- Greedy choice; not globally optimal.
- Dependencies are simple upstream/downstream links; no redundancy, alternate feeds, switching or electrical behaviour.
- A restored asset is assumed to unblock its dependants immediately.
