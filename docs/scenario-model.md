# ReGrid AI — Scenario Model (v1)

> **Prototype planning logic on simulated data. This prototype does not perform power flow, dispatch, switching, crew travel, or field-safety validation.** AI recommends. Engineers decide.

Implementation: `src/lib/restoration/scenario.ts` (tests: `scenario.test.ts`, `npm test`). UI: `/scenarios`.

## Purpose

Let an engineer change planning conditions, recalculate with the accepted engines, and compare a modified plan against the baseline.

## Evaluation flow

```
scenario inputs → scenario-specific crew roster → scoring engine → sequencing engine → metrics
```

`evaluateScenario` only builds the scenario's inputs and metrics; scoring (`scoring.ts`) and sequencing (`sequencing.ts`) are reused unchanged. Baseline Overview / Restoration Plan use the same engines. The Scenario page evaluates in the browser by calling the same pure functions when *Recalculate* is pressed.

## Supported inputs

| Input | Range | Affects |
|---|---|---|
| Available Repair Crews | integer, 0 to total crews (baseline = 3 = the whole roster, including the already-assigned crew) | scoring (Resource Availability), sequencing (via scores), plan duration |
| Available Generation Capacity (MW) | finite, ≥ 0 (baseline 60) | capacity-screening metrics only |

Invalid values throw a descriptive error (shown in the UI).

## Crew reduction rule

Crews are ordered: `assigned`/`en_route` first, then `available`, each by ascending crew ID. The first *N* are kept; the rest are removed from the scenario roster. Reducing the count therefore removes unassigned crews with the highest IDs first, and only then already-assigned crews. Nothing is random. The scoring crew rule is unchanged (full credit for an assigned crew, half for any available unassigned crew, else 0), so with the baseline data:

- 3 → 2 crews removes CREW-CHARLIE; ALPHA is still available, so scores do not change.
- 1 crew leaves only CREW-BRAVO; every asset except SUB-04 loses its 5-point crew credit.
- 0 crews also removes BRAVO's credit from SUB-04.

Because the crew credit is nearly uniform in this dataset, order changes only when the score gaps are small enough (see the test fixture `flipInput`); with the current mock data the recommended order stays the same and scores and plan duration change. The page says so rather than manufacturing a reorder.

## Generation capacity behavior

Aggregate capacity screening only. Walking the recommended sequence, each **offline** `ServiceArea` supplied by a sequenced asset is "within capacity" if its demand fits in the remaining capacity, otherwise "exceeding capacity" (later, smaller areas may still fit). Metrics: demand and population within/exceeding capacity. It does **not** reorder the plan or change scores, and implies nothing about voltage, frequency, network flow, or dispatch. Service areas are non-overlapping, so totals do not double count.

## Metrics

- **Total repair work hours:** sum of estimated repair hours (missing = 0).
- **Estimated plan duration (crew-aware):** greedy planning estimate. With *N* crews, the earliest-free crew starts the asset that can begin earliest (ties: earlier recommended sequence), never before its required upstream assets finish. `null` with 0 crews. It ignores travel, switching, materials, shifts, and field conditions and is not optimal.
- Capacity metrics as above. Critical-facility restoration is not computed in this version.

## Change explanations

Per asset: sequence change, score change, and the exact scoring factors whose contributions differ. Wording is deterministic and only states calculated differences ("moved from #a to #b after recalculating priority and dependency order under the modified scenario"); no single cause is claimed.

## Limitations

- Only two inputs; other Designer controls are not modelled.
- Capacity is a screening check, not a constraint on sequencing.
- Plan duration is a rough estimate.
- Baseline crew count is the whole simulated roster, which differs from Overview's "available crews" (unassigned only).

## Determinism

Same inputs → same outputs; no randomness, clock, or I/O; inputs are never mutated.
