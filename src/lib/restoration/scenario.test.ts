import assert from "node:assert/strict";
import { test } from "node:test";
import * as data from "../../data/mockGridData.ts";
import type { RestorationScenario } from "../../types/grid";
import { compareScenarios, evaluateScenario, selectScenarioCrews } from "./scenario.ts";
import type { ScoringInput } from "./scoring.ts";
import { sequenceRestoration } from "./sequencing.ts";

const mockInput = (): ScoringInput => ({
  assets: data.mockAssets,
  dependencies: data.mockDependencies,
  criticalFacilities: data.mockCriticalFacilities,
  crews: data.mockCrews,
  serviceAreas: data.mockServiceAreas,
});
const scenario = (over: Partial<RestorationScenario> = {}): RestorationScenario => ({
  ...data.mockBaselineScenario,
  ...over,
});
const order = (r: ReturnType<typeof evaluateScenario>) => r.recommendations.map((x) => x.assetId);

// X outranks Y only thanks to its assigned crew; removing that crew flips the order.
const flipInput = (): ScoringInput => ({
  assets: [
    { id: "X", name: "X", type: "Substation", status: "damaged", estimatedRepairHours: 6, populationServed: 100 },
    { id: "Y", name: "Y", type: "Substation", status: "damaged", estimatedRepairHours: 4, populationServed: 100 },
  ],
  dependencies: [],
  criticalFacilities: [],
  crews: [
    { id: "C1", name: "C1", status: "assigned", assignedAssetId: "X" },
    { id: "C2", name: "C2", status: "available" },
  ],
});

test("baseline evaluation is deterministic and equals the engines' output", () => {
  const a = evaluateScenario(mockInput(), scenario());
  assert.deepEqual(a, evaluateScenario(mockInput(), scenario()));
  const seq = sequenceRestoration(mockInput());
  assert.deepEqual(order(a), seq.map((s) => s.assetId));
  assert.deepEqual(a.recommendations.map((r) => r.priorityScore), seq.map((s) => s.priorityScore));
  assert.deepEqual(a.removedCrewIds, []);
});

test("no static recommendation fixture exists in mock data", () => {
  assert.equal("mockRecommendations" in data, false);
  assert.equal("mockPriorityFactors" in data, false);
});

test("crew rule keeps assigned crews first, then available by ID", () => {
  const { kept, removed } = selectScenarioCrews(data.mockCrews, 2);
  assert.deepEqual(kept.map((c) => c.id), ["CREW-BRAVO", "CREW-ALPHA"]);
  assert.deepEqual(removed.map((c) => c.id), ["CREW-CHARLIE"]);
});

test("reducing crews changes scoring inputs and recalculates scores", () => {
  const base = evaluateScenario(mockInput(), scenario());
  const one = evaluateScenario(mockInput(), scenario({ availableCrews: 1 }));
  assert.deepEqual(one.crewIds, ["CREW-BRAVO"]);
  const score = (r: typeof base, id: string) => r.recommendations.find((x) => x.assetId === id)!.priorityScore;
  assert.equal(score(one, "SUB-04"), score(base, "SUB-04")); // its crew is kept
  assert.equal(score(one, "LINE-12"), Math.round((score(base, "LINE-12") - 5) * 10) / 10); // half credit lost
});

test("reducing crews reruns sequencing", () => {
  const base = evaluateScenario(flipInput(), scenario({ availableCrews: 2 }));
  const none = evaluateScenario(flipInput(), scenario({ availableCrews: 0 }));
  assert.deepEqual(order(base), ["X", "Y"]);
  assert.deepEqual(order(none), ["Y", "X"]);
  const changes = compareScenarios(base, none);
  assert.ok(changes.every((c) => c.positionChanged));
  assert.match(changes[0].explanation, /moved from #\d to #\d after recalculating/);
});

test("baseline-equivalent inputs reproduce the baseline (reset)", () => {
  const base = evaluateScenario(mockInput(), scenario());
  evaluateScenario(mockInput(), scenario({ availableCrews: 1, generationCapacityMw: 5 }));
  assert.deepEqual(evaluateScenario(mockInput(), scenario()), base);
  assert.ok(compareScenarios(base, base).every((c) => !c.positionChanged && !c.scoreChanged));
});

test("invalid crew counts and capacities are rejected", () => {
  for (const availableCrews of [-1, 1.5, NaN, 4]) {
    assert.throws(() => evaluateScenario(mockInput(), scenario({ availableCrews })), /availableCrews/);
  }
  for (const generationCapacityMw of [-1, NaN, Infinity]) {
    assert.throws(() => evaluateScenario(mockInput(), scenario({ generationCapacityMw })), /generationCapacityMw/);
  }
});

test("plan duration accounts for crew count", () => {
  const m = (n: number) => evaluateScenario(mockInput(), scenario({ availableCrews: n })).metrics;
  assert.equal(m(3).totalRepairWorkHours, 18);
  assert.equal(m(3).estimatedPlanDurationHours, 10);
  assert.equal(m(1).estimatedPlanDurationHours, 18);
  assert.equal(m(0).estimatedPlanDurationHours, null);
});

test("generation capacity screening: sufficient, reduced, zero, below one area", () => {
  const m = (mw: number) => evaluateScenario(mockInput(), scenario({ generationCapacityMw: mw })).metrics;
  const ok = m(60);
  assert.equal(ok.demandServedMw, 9.3);
  assert.equal(ok.populationServed, 28200);
  assert.deepEqual(ok.unservedServiceAreaIds, []);
  assert.deepEqual(m(9.3).unservedServiceAreaIds, []); // exact fit
  const reduced = m(7); // SUB-04 area (6.2) fits first, SUB-02 area (3.1) does not
  assert.deepEqual(reduced.unservedServiceAreaIds, ["AREA-EASTLINE"]);
  assert.equal(reduced.demandServedMw, 6.2);
  assert.equal(reduced.demandUnservedMw, 3.1);
  const zero = m(0);
  assert.equal(zero.populationServed, 0);
  assert.deepEqual(zero.unservedServiceAreaIds, ["AREA-MERIDIAN", "AREA-EASTLINE"]);
  assert.deepEqual(m(3.5).unservedServiceAreaIds, ["AREA-MERIDIAN"]); // below the 6.2 MW area, but 3.1 fits
});

test("generation capacity does not change sequence or scores", () => {
  const a = evaluateScenario(mockInput(), scenario());
  const b = evaluateScenario(mockInput(), scenario({ generationCapacityMw: 0 }));
  assert.deepEqual(a.recommendations, b.recommendations);
});

test("evaluation does not mutate input data", () => {
  const input = mockInput();
  const copy = structuredClone(input);
  evaluateScenario(input, scenario({ availableCrews: 1, generationCapacityMw: 5 }));
  assert.deepEqual(input, copy);
});

test("invalid repair durations are rejected with the asset ID", () => {
  const withHours = (hours: number | null | undefined): ScoringInput => ({
    assets: [
      { id: "GOOD", name: "GOOD", type: "Substation", status: "damaged", estimatedRepairHours: 3 },
      { id: "BAD", name: "BAD", type: "Substation", status: "damaged", estimatedRepairHours: hours },
    ],
    dependencies: [],
    criticalFacilities: [],
    crews: [{ id: "C", name: "C", status: "available" }],
  });
  const run = (hours: number | null | undefined) =>
    evaluateScenario(withHours(hours), scenario({ availableCrews: 1 }));
  for (const bad of [-5, NaN, Infinity, -Infinity]) {
    assert.throws(() => run(bad), /estimatedRepairHours.*asset BAD/);
  }
  const zero = run(0).metrics;
  assert.equal(zero.totalRepairWorkHours, 3);
  assert.equal(zero.estimatedPlanDurationHours, 3);
  for (const missing of [null, undefined]) {
    const m = run(missing).metrics; // documented policy: missing counts as 0 hours
    assert.equal(m.totalRepairWorkHours, 3);
    assert.equal(m.estimatedPlanDurationHours, 3);
  }
  assert.equal(run(4).metrics.totalRepairWorkHours, 7);
  assert.equal(run(4).metrics.estimatedPlanDurationHours, 7);
});
