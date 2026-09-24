# Limitations

ReGrid AI is a transparent prototype, not a validated utility restoration tool.

**Data**
- All infrastructure, population, demand and crew data is simulated. The dataset is small (a handful of damaged assets), so results illustrate the method and are not evidence of real-world performance.
- The dependency graph is simplified to upstream/downstream links. There is no redundancy, alternate feed, or looped topology.

**Scoring** (`docs/scoring-model.md`)
- Weights (30/25/20/15/10), the 24-hour repair cap and the 0.5 crew credit are judgment calls, not calibrated or validated.
- Dependency impact counts direct downstream links only. Critical facilities are counted equally, with no criticality tiers.
- The crew factor ignores skills, travel time and equipment.

**Sequencing** (`docs/sequencing-model.md`)
- Greedy and not globally optimal. A restored asset is assumed to unblock its dependants immediately.

**Scenarios** (`docs/scenario-model.md`)
- Only two inputs: crew count and generation capacity.
- The plan-duration metric is a rough greedy estimate that ignores travel, materials, shifts and field conditions.
- Generation capacity is aggregate screening against service-area demand only. It does not change the sequence.
- Critical-facility restoration is not computed.

**Not modelled**
- No power flow, no voltage or frequency analysis, no switching validation, no protection or safety analysis.
- No SCADA integration and no autonomous control.
- No backend, database or persistence. Engineer review decisions live in browser memory and are lost on reload.
- No AI/LLM component. All logic is deterministic.

**Status**
- Not utility-validated and not for operational use. Engineers must review every recommendation.
