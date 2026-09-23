import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreRestorationCandidates, type ScoringInput } from "./scoring.ts";

const base = (): ScoringInput => ({
  assets: [
    { id: "GEN", name: "Gen", type: "Generation", status: "operational" },
    { id: "A", name: "A", type: "Substation", status: "damaged", estimatedRepairHours: 6, populationServed: 10000, assignedCrewId: "C1" },
    { id: "B", name: "B", type: "Distribution Feeder", status: "damaged", estimatedRepairHours: 2, populationServed: 5000, criticalFacility: "Hospital X (Hospital)" },
    { id: "FAC", name: "Hospital X", type: "Critical Facility - Hospital", status: "damaged" },
  ],
  dependencies: [
    { id: "D1", upstreamAssetId: "GEN", downstreamAssetId: "A" },
    { id: "D2", upstreamAssetId: "A", downstreamAssetId: "B" },
    { id: "D3", upstreamAssetId: "A", downstreamAssetId: "FAC" },
  ],
  criticalFacilities: [{ id: "CF", name: "Hospital X", type: "Hospital", assetId: "FAC", status: "offline" }],
  crews: [
    { id: "C1", name: "One", status: "assigned", assignedAssetId: "A" },
    { id: "C2", name: "Two", status: "available" },
  ],
});

const get = (input: ScoringInput, id: string) => scoreRestorationCandidates(input).find((s) => s.assetId === id)!;
const factor = (input: ScoringInput, id: string, name: string) =>
  get(input, id).factors.find((f) => f.factor === name)!.contribution;

test("is deterministic", () => {
  assert.deepEqual(scoreRestorationCandidates(base()), scoreRestorationCandidates(base()));
});

test("scores stay within 0-100 and contributions sum to total", () => {
  for (const s of scoreRestorationCandidates(base())) {
    assert.ok(s.totalScore >= 0 && s.totalScore <= 100);
    const sum = s.factors.reduce((t, f) => t + Math.round(f.contribution * 10), 0);
    assert.equal(sum / 10, s.totalScore);
    for (const f of s.factors) assert.ok(f.contribution <= f.maxContribution);
  }
});

test("excludes operational and facility assets", () => {
  assert.deepEqual(scoreRestorationCandidates(base()).map((s) => s.assetId).sort(), ["A", "B"]);
});

test("critical-facility relationship raises facility factor", () => {
  const input = base();
  assert.equal(factor(input, "B", "Critical Facility Impact"), 30);
  assert.equal(factor(input, "A", "Critical Facility Impact"), 30); // direct downstream into facility
  input.criticalFacilities = [];
  assert.equal(factor(input, "B", "Critical Facility Impact"), 0);
});

test("larger population gives higher population contribution", () => {
  const input = base();
  assert.ok(factor(input, "A", "Population Impact") > factor(input, "B", "Population Impact"));
  assert.equal(factor(input, "A", "Population Impact"), 25);
});

test("shorter repair gives higher feasibility contribution", () => {
  const input = base();
  assert.ok(factor(input, "B", "Repair Feasibility") > factor(input, "A", "Repair Feasibility"));
});

test("dependency contribution derives from Dependency records", () => {
  const input = base();
  assert.equal(factor(input, "A", "Dependency Impact"), 20); // 2 downstream (max)
  assert.equal(factor(input, "B", "Dependency Impact"), 0);
  input.dependencies = [];
  assert.equal(factor(input, "A", "Dependency Impact"), 0);
});

test("exposes upstream blocking information", () => {
  const input = base();
  const b = get(input, "B");
  assert.deepEqual(b.blockingUpstreamAssetIds, ["A"]);
  assert.equal(b.requiresUpstreamRestoration, true);
  assert.equal(get(input, "A").requiresUpstreamRestoration, false);
});

test("handles missing optional values safely", () => {
  const input = base();
  input.assets = [{ id: "X", name: "X", type: "Substation", status: "damaged" }];
  input.dependencies = [];
  input.criticalFacilities = [];
  input.crews = [];
  const [s] = scoreRestorationCandidates(input);
  assert.equal(s.totalScore, 0);
  assert.deepEqual(scoreRestorationCandidates({ ...input, assets: [] }), []);
});

test("does not mutate input", () => {
  const input = base();
  const copy = structuredClone(input);
  scoreRestorationCandidates(input);
  assert.deepEqual(input, copy);
});

const solo = (over: Partial<ScoringInput["assets"][number]>[], extra: Partial<ScoringInput> = {}): ScoringInput => ({
  assets: over.map((o, i) => ({ id: `S${i}`, name: `S${i}`, type: "Substation", status: "damaged" as const, ...o })),
  dependencies: [],
  criticalFacilities: [],
  crews: [],
  ...extra,
});

test("invalid population values never produce non-finite scores", () => {
  for (const bad of [Infinity, NaN, -5]) {
    const input = solo([{ populationServed: bad }, { populationServed: 100 }]);
    for (const s of scoreRestorationCandidates(input)) {
      assert.ok(Number.isFinite(s.totalScore) && s.totalScore >= 0 && s.totalScore <= 100);
    }
    assert.equal(factor(input, "S0", "Population Impact"), 0);
    assert.equal(factor(input, "S1", "Population Impact"), 25);
  }
  const allBad = solo([{ populationServed: Infinity }, { populationServed: 0 }]);
  for (const s of scoreRestorationCandidates(allBad)) assert.ok(Number.isFinite(s.totalScore));
});

test("non-finite service-area population is ignored", () => {
  const input = solo([{}], {
    serviceAreas: [{ id: "Z", name: "Z", population: Infinity, demandMw: 1, status: "offline", suppliedByAssetId: "S0" }],
  });
  assert.equal(factor(input, "S0", "Population Impact"), 0);
});

test("dependencies with missing endpoints throw", () => {
  const down = base();
  down.dependencies = [...down.dependencies, { id: "BAD1", upstreamAssetId: "A", downstreamAssetId: "MISSING" }];
  assert.throws(() => scoreRestorationCandidates(down), /BAD1.*downstream.*MISSING/);
  const up = base();
  up.dependencies = [...up.dependencies, { id: "BAD2", upstreamAssetId: "MISSING", downstreamAssetId: "A" }];
  assert.throws(() => scoreRestorationCandidates(up), /BAD2.*upstream.*MISSING/);
  assert.doesNotThrow(() => scoreRestorationCandidates(base()));
});

test("facility label must match exactly, not by prefix", () => {
  const input = solo([{ criticalFacility: "Hospital Annex" }]);
  input.criticalFacilities = [{ id: "CF", name: "Hospital", type: "Hospital", assetId: "NONE", status: "offline" }];
  assert.equal(factor(input, "S0", "Critical Facility Impact"), 0);
  input.assets = [{ ...input.assets[0], criticalFacility: "Hospital (Hospital)" }];
  assert.equal(factor(input, "S0", "Critical Facility Impact"), 30);
});

test("crew scoring: assigned, available, other-asset, none", () => {
  const res = (crews: ScoringInput["crews"], assignedCrewId?: string) =>
    factor(solo([{ assignedCrewId }], { crews }), "S0", "Resource Availability");
  assert.equal(res([{ id: "C", name: "C", status: "assigned", assignedAssetId: "S0" }], "C"), 10);
  assert.equal(res([{ id: "C", name: "C", status: "en_route", assignedAssetId: "S0" }]), 10);
  assert.equal(res([{ id: "C", name: "C", status: "available" }], "C"), 5);
  assert.equal(res([{ id: "C", name: "C", status: "assigned", assignedAssetId: "OTHER" }], "C"), 0);
  assert.equal(
    res([{ id: "C", name: "C", status: "assigned", assignedAssetId: "OTHER" }, { id: "D", name: "D", status: "available" }]),
    5,
  );
  assert.equal(res([]), 0);
});
