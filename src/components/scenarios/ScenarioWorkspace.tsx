"use client";

import { useMemo, useState } from "react";
import { compareScenarios, evaluateScenario } from "@/lib/restoration/scenario";
import type { ScoringInput } from "@/lib/restoration/scoring";
import type { GridAsset, RestorationScenario, ScenarioChange, ScenarioMetrics, ScenarioResult } from "@/types/grid";

const fmtHours = (h: number | null) => (h == null ? "No crews" : `${h} h`);

const METRIC_ROWS: { label: string; format: (m: ScenarioMetrics) => string }[] = [
  { label: "Repair crews in planning roster", format: (m) => String(m.availableCrews) },
  { label: "Total repair work hours", format: (m) => `${m.totalRepairWorkHours} h` },
  { label: "Estimated plan duration (crew-aware)", format: (m) => fmtHours(m.estimatedPlanDurationHours) },
  { label: "Generation capacity", format: (m) => `${m.generationCapacityMw} MW` },
  { label: "Demand within capacity", format: (m) => `${m.demandServedMw} MW` },
  { label: "Demand exceeding capacity", format: (m) => `${m.demandUnservedMw} MW` },
  { label: "Population within capacity", format: (m) => m.populationServed.toLocaleString("en-US") },
  { label: "Population exceeding capacity", format: (m) => m.populationUnserved.toLocaleString("en-US") },
];

export function ScenarioWorkspace({
  input,
  baselineScenario,
  assets,
}: {
  input: ScoringInput;
  baselineScenario: RestorationScenario;
  assets: GridAsset[];
}) {
  const baseline = useMemo(() => evaluateScenario(input, baselineScenario), [input, baselineScenario]);
  const [crewsDraft, setCrewsDraft] = useState(String(baselineScenario.availableCrews));
  const [capacityDraft, setCapacityDraft] = useState(String(baselineScenario.generationCapacityMw));
  const [modified, setModified] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assetById = new Map(assets.map((a) => [a.id, a]));
  const changes = useMemo(() => (modified ? compareScenarios(baseline, modified) : []), [baseline, modified]);
  const changeById = new Map(changes.map((c) => [c.assetId, c]));

  const recalculate = () => {
    try {
      setModified(
        evaluateScenario(input, {
          id: "modified",
          name: "Modified",
          availableCrews: crewsDraft.trim() === "" ? NaN : Number(crewsDraft),
          generationCapacityMw: capacityDraft.trim() === "" ? NaN : Number(capacityDraft),
        }),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario could not be evaluated.");
    }
  };

  const reset = () => {
    setCrewsDraft(String(baselineScenario.availableCrews));
    setCapacityDraft(String(baselineScenario.generationCapacityMw));
    setModified(null);
    setError(null);
  };

  const changedAssets = changes.filter((c) => c.positionChanged || c.scoreChanged);

  return (
    <div className="scenario-workspace">
      <div className="card scenario-controls">
        <div className="panel-title">Scenario Controls</div>
        <div className="scenario-fields">
          <label className="scenario-field">
            <span className="scenario-field-label">Available Repair Crews</span>
            <input
              className="override-input"
              type="number"
              min={0}
              max={input.crews.length}
              step={1}
              value={crewsDraft}
              onChange={(e) => setCrewsDraft(e.target.value)}
            />
            <span className="review-note">
              Crews in the planning roster (0–{input.crews.length}; baseline = all {input.crews.length}, including
              already-assigned crews). Removal order: unassigned crews by highest ID first.
            </span>
          </label>
          <label className="scenario-field">
            <span className="scenario-field-label">Available Generation Capacity (MW)</span>
            <input
              className="override-input"
              type="number"
              min={0}
              step={0.1}
              value={capacityDraft}
              onChange={(e) => setCapacityDraft(e.target.value)}
            />
            <span className="review-note">
              Aggregate capacity screening against offline service-area demand only. Does not change scores or
              sequence; not a power-flow or dispatch analysis.
            </span>
          </label>
        </div>
        <div className="review-actions">
          <button type="button" className="review-btn review-btn-active" onClick={recalculate}>
            Recalculate Restoration Plan
          </button>
          <button type="button" className="review-btn" onClick={reset}>
            Reset to Baseline
          </button>
        </div>
        {error ? <div className="override-error">{error}</div> : null}
      </div>

      <div className="scenario-columns">
        <ScenarioColumn title="Baseline Scenario" result={baseline} assetById={assetById} />
        {modified ? (
          <ScenarioColumn title="Modified Scenario" result={modified} assetById={assetById} changeById={changeById} />
        ) : (
          <div className="card">
            <div className="panel-title">Modified Scenario</div>
            <p className="plan-section-note">
              Change the controls and press Recalculate Restoration Plan to evaluate a modified scenario.
            </p>
          </div>
        )}
      </div>

      {modified ? (
        <>
          <div className="card">
            <div className="panel-title">Metrics: Baseline vs Modified</div>
            <table className="scenario-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Baseline</th>
                  <th>Modified</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((row) => {
                  const a = row.format(baseline.metrics);
                  const b = row.format(modified.metrics);
                  return (
                    <tr key={row.label} className={a !== b ? "scenario-row-changed" : undefined}>
                      <td>{row.label}</td>
                      <td className="mono">{a}</td>
                      <td className="mono">{b}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="panel-title">What Changed</div>
            {changedAssets.length === 0 ? (
              <p className="plan-section-note">
                Recommended order and priority scores are identical to baseline for these inputs.
                {modified.metrics.estimatedPlanDurationHours !== baseline.metrics.estimatedPlanDurationHours
                  ? " Only the crew-aware plan duration differs."
                  : ""}
              </p>
            ) : (
              <ul className="scenario-changes">
                {changedAssets.map((c) => (
                  <li key={c.assetId}>{c.explanation}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      <p className="review-note">
        Simulated prototype data. Deterministic dependency-aware planning only — no power-flow, dispatch, switching,
        crew travel, or field-safety validation. AI recommends. Engineers decide.
      </p>
    </div>
  );
}

function ScenarioColumn({
  title,
  result,
  assetById,
  changeById,
}: {
  title: string;
  result: ScenarioResult;
  assetById: Map<string, GridAsset>;
  changeById?: Map<string, ScenarioChange>;
}) {
  return (
    <div className="card">
      <div className="panel-title">{title}</div>
      <div className="panel-subtitle">
        {result.metrics.availableCrews} crew(s) · {result.metrics.generationCapacityMw} MW
      </div>
      <div className="scenario-list">
        {result.recommendations.map((rec) => {
          const change = changeById?.get(rec.assetId);
          const moved = change?.positionChanged ?? false;
          return (
            <div key={rec.assetId} className={`scenario-item${moved ? " scenario-item-moved" : ""}`}>
              <span className="plan-row-seq mono">{rec.recommendedSequence}</span>
              <span className="plan-row-asset">
                <span className="mono plan-row-asset-id">{rec.assetId}</span>
                <span className="plan-row-asset-type">{assetById.get(rec.assetId)?.name}</span>
              </span>
              <span className="scenario-item-meta mono">
                {moved ? `#${change!.baselineSequence} → #${rec.recommendedSequence} · ` : ""}
                {rec.priorityScore}
                {change?.scoreChanged ? ` (was ${change.baselineScore})` : ""}
              </span>
            </div>
          );
        })}
        {result.recommendations.length === 0 ? <p className="plan-section-note">No restoration candidates.</p> : null}
      </div>
    </div>
  );
}
