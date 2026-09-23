# ReGrid AI — Restoration Scoring Model (v1)

> **Prototype decision-support logic, not a validated utility restoration standard.**
> All inputs are simulated prototype data. AI recommends. Engineers decide.

Implementation: `src/lib/restoration/scoring.ts` (tests: `scoring.test.ts`, run with `npm test`).

## Purpose

Rank damaged grid assets by a transparent 0–100 priority score so an engineer can see *why* an asset is ranked where it is. The score is a ranking aid only. It is not an optimal restoration plan, a power-flow result, or a prediction of outage time.

## Eligibility

An asset is scored only if it is **not** a critical-facility asset (those are consumers of service) and its status is **`damaged`** or **`repair`**. Operational, restored and critical-status assets are never ranked.

## Factors and weights (sum = 100)

| Factor | Max | Normalized value (0–1) |
|---|---|---|
| Critical Facility Impact | 30 | facilities not yet online that the asset feeds ÷ max across candidates |
| Population Impact | 25 | population served ÷ max across candidates |
| Dependency Impact | 20 | direct downstream asset count ÷ max across candidates |
| Repair Feasibility | 15 | 1 − repair hours ÷ 24 (clamped to 0–1) |
| Resource Availability | 10 | 1.0 a crew with status `assigned`/`en_route` is assigned to this asset; 0.5 otherwise if any crew is `available` with no assignment; 0 otherwise |

`contribution = weight × normalized value`; `totalScore = Σ contributions`.

**Data sources.** Facility link: a direct downstream dependency into a `CriticalFacility`'s asset, or an exact (case/space-insensitive) match of the asset's `criticalFacility` label to `<name>` or `<name> (<type>)` (no prefix matching) (facilities with status `online` are ignored; each facility counted once). Population: `populationServed`, else the sum of simulated `ServiceArea` populations the asset supplies. NaN, Infinity or negative values count as 0 and never enter the normalization maximum. Downstream count: `Dependency` records. No asset IDs are hardcoded.

## Rounding and determinism

Each contribution is rounded to one decimal; the total is the exact sum of the rounded contributions, so breakdowns always add up. Same input → same output: no randomness, clock, I/O or mutation. Ties are broken by asset ID.

## Data integrity

Every `Dependency` endpoint must match a supplied asset; otherwise scoring throws an error naming the dependency ID and the missing asset instead of returning misleading scores.

## Missing data

Missing population, repair hours, or facility links contribute 0 for that factor (and the explanation says so). Nothing is imputed.

## Dependency safety (not applied to the score)

Each result exposes `upstreamAssetIds`, `blockingUpstreamAssetIds` (direct upstream assets that are damaged / under repair / critical) and `requiresUpstreamRestoration`. The score is **not** reduced for blocked assets: a high score does not mean the asset can deliver service immediately. The current `recommendedSequence` is score rank only; dependency-aware sequencing is a later milestone.

## Limitations

- Weights, the 24 h cap and the 0.5 crew credit are judgment calls, not calibrated or validated.
- Dependency impact counts direct downstream links only (no transitive or centrality analysis).
- Facilities are counted equally; no criticality tiers (e.g. hospital vs. other).
- Crew factor ignores skills, travel time and equipment.
- Relative normalization means scores are comparable only within one candidate set.
- No electrical behaviour (load flow, capacity, protection) is modelled.
