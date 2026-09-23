import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreRestorationCandidates, type ScoringInput } from "./scoring.ts";
import { SequencingDeadlockError, sequenceRestoration } from "./sequencing.ts";

type Asset = ScoringInput["assets"][number];
const asset = (id: string, over: Partial<Asset> = {}): Asset => ({
  id,
  name: id,
  type: "Substation",
  status: "damaged",
  ...over,
});
const dep = (up: string, down: string) => ({ id: `${up}>${down}`, upstreamAssetId: up, downstreamAssetId: down });
const input = (assets: Asset[], dependencies: ScoringInput["dependencies"] = []): ScoringInput => ({
  assets,
  dependencies,
  criticalFacilities: [],
  crews: [],
});
const ids = (i: ScoringInput) => sequenceRestoration(i).map((r) => r.assetId);

// UP is low priority (small population); DOWN is high priority but depends on UP.
const chain = (): ScoringInput =>
  input(
    [
      asset("GEN", { status: "operational" }),
      asset("UP", { estimatedRepairHours: 20, populationServed: 100 }),
      asset("DOWN", { estimatedRepairHours: 1, populationServed: 50000 }),
    ],
    [dep("GEN", "UP"), dep("UP", "DOWN")],
  );

test("is deterministic", () => {
  assert.deepEqual(sequenceRestoration(chain()), sequenceRestoration(chain()));
});

test("highest-scoring feasible asset goes first", () => {
  const i = input([asset("LOW", { populationServed: 10 }), asset("HIGH", { populationServed: 1000 })]);
  assert.deepEqual(ids(i), ["HIGH", "LOW"]);
});

test("lower-priority upstream precedes higher-priority downstream", () => {
  const i = chain();
  const scores = new Map(scoreRestorationCandidates(i).map((s) => [s.assetId, s.totalScore]));
  assert.ok(scores.get("DOWN")! > scores.get("UP")!);
  const seq = sequenceRestoration(i);
  assert.deepEqual(seq.map((r) => r.assetId), ["UP", "DOWN"]);
  assert.deepEqual(seq[1].upstreamRequiredAssetIds, ["UP"]);
  assert.match(seq[1].sequencingReason, /after UP/);
  assert.match(seq[0].sequencingReason, /DOWN still waiting/);
});

test("operational upstream does not block", () => {
  const i = input([asset("GEN", { status: "operational" }), asset("L")], [dep("GEN", "L")]);
  const [r] = sequenceRestoration(i);
  assert.equal(r.assetId, "L");
  assert.deepEqual(r.upstreamRequiredAssetIds, []);
});

test("damage upstream of an operational intermediate still blocks", () => {
  const i = input([asset("A"), asset("OP", { status: "operational" }), asset("B", { populationServed: 9 })], [
    dep("A", "OP"),
    dep("OP", "B"),
  ]);
  assert.deepEqual(ids(i), ["A", "B"]);
});

test("ties break by repair hours then asset id", () => {
  const same = { populationServed: 100 };
  assert.deepEqual(ids(input([asset("B", { ...same, estimatedRepairHours: 4 }), asset("A", { ...same, estimatedRepairHours: 4 })])), ["A", "B"]);
  // Shorter repair means higher feasibility score, so equal totals need offsetting inputs; verify order is stable anyway.
  const i = input([asset("Z", same), asset("Y", same)]);
  assert.deepEqual(ids(i), ["Y", "Z"]);
  assert.deepEqual(ids({ ...i, assets: [...i.assets].reverse() }), ["Y", "Z"]);
});

test("cycle is detected", () => {
  const i = input([asset("A"), asset("B")], [dep("A", "B"), dep("B", "A")]);
  assert.throws(() => sequenceRestoration(i), (e) => e instanceof SequencingDeadlockError && e.unresolvedAssetIds.join() === "A,B");
  assert.throws(() => sequenceRestoration(input([asset("S")], [dep("S", "S")])), /deadlock.*S/);
});

test("invalid dependency endpoint is rejected", () => {
  assert.throws(() => sequenceRestoration(input([asset("A")], [dep("A", "MISSING")])), /MISSING/);
});

test("operational assets are excluded", () => {
  const i = input([asset("OK", { status: "operational" }), asset("BAD")]);
  assert.deepEqual(ids(i), ["BAD"]);
});

test("sequence positions are unique and contiguous", () => {
  const i = input(
    [asset("A"), asset("B", { populationServed: 5 }), asset("C", { populationServed: 9 }), asset("D")],
    [dep("A", "C")],
  );
  assert.deepEqual(sequenceRestoration(i).map((r) => r.recommendedSequence), [1, 2, 3, 4]);
});

test("does not mutate input and leaves scores unchanged", () => {
  const i = chain();
  const copy = structuredClone(i);
  const seq = sequenceRestoration(i);
  assert.deepEqual(i, copy);
  const scores = new Map(scoreRestorationCandidates(i).map((s) => [s.assetId, s.totalScore]));
  for (const r of seq) assert.equal(r.priorityScore, scores.get(r.assetId));
});

test("empty candidate set returns empty sequence", () => {
  assert.deepEqual(sequenceRestoration(input([asset("OK", { status: "operational" })])), []);
  assert.deepEqual(sequenceRestoration(input([])), []);
});

test("equal scores: shorter repair duration wins before asset ID", () => {
  // Repairs of 24h or more all get zero feasibility, so scores are equal while durations differ.
  const i = input([
    asset("A", { populationServed: 100, estimatedRepairHours: 30 }),
    asset("Z", { populationServed: 100, estimatedRepairHours: 25 }),
  ]);
  const seq = sequenceRestoration(i);
  assert.equal(seq[0].priorityScore, seq[1].priorityScore);
  assert.deepEqual(seq.map((r) => r.assetId), ["Z", "A"]);
});
