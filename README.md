# ReGrid AI

ReGrid AI is a simulated infrastructure-restoration decision-support prototype developed for ABB Accelerator 2026.

It addresses one question: **given damaged electrical infrastructure and limited recovery resources, what should engineers repair first, in what sequence, and why?**

## Key Features

- Deterministic restoration priority scoring (0–100, five weighted, documented factors)
- Dependency-aware sequencing (upstream repairs come before the assets that depend on them)
- Infrastructure dependency visualization
- Scenario recalculation (repair-crew count and generation capacity) with a baseline-vs-modified comparison
- Explainable recommendations (per-factor score breakdown and sequencing reason)
- Engineer review workflow (accept, flag, or override a recommended sequence position)
- Simulated prototype dataset

## Human-in-the-Loop

**AI recommends. Engineers decide.**

ReGrid does not switch electrical equipment, energize infrastructure, control SCADA, execute repairs, or replace qualified engineers. Its output is a recommendation for engineers to review.

## How It Works

```
Simulated infrastructure data
  → deterministic scoring
  → dependency-aware sequencing
  → scenario evaluation
  → dashboard / explanations
  → engineer review
```

The scoring, sequencing and scenario logic lives in `src/lib/restoration/` as pure, framework-independent TypeScript. The UI only displays and re-invokes it.

## Current Prototype Scope

Implemented: Overview, Infrastructure, Restoration Plan and Scenarios pages; the scoring, sequencing and scenario engines; engineer review controls (held in browser state only, not persisted).

Not implemented, and not claimed:

- All data is **simulated**. This is **not utility-grade software**.
- No power-flow validation, and no voltage or frequency analysis
- No switching simulation
- No autonomous grid control, and no SCADA integration
- No backend, database, authentication, or AI/LLM component

See [docs/limitations.md](docs/limitations.md).

## Technology

- Next.js (App Router), React, TypeScript
- Deterministic domain algorithms (no ML, no external services)
- Node.js built-in test runner

## Run Locally

Requires Node.js 20.9 or newer. No API keys or environment variables are needed.

```bash
npm install
npm run dev
```

Open http://localhost:3000 (it redirects to the Overview page).

Production build:

```bash
npm run build
npm start
```

The build downloads the IBM Plex fonts from Google Fonts, so it needs internet access.

## Tests

```bash
npm test
```

Runs the scoring, sequencing and scenario unit tests (40 tests at the time of writing). The tests are executed directly from TypeScript, which requires Node.js 22.18 or newer.

Other checks: `npm run typecheck`, `npm run lint`.

## Documentation

- [Scoring model](docs/scoring-model.md)
- [Sequencing model](docs/sequencing-model.md)
- [Scenario model](docs/scenario-model.md)
- [Limitations](docs/limitations.md)
- [Run instructions](docs/run-instructions.md)

`design-reference/` holds the design mockup used as a visual reference only. It is not imported by the application.

## Competition

Developed as a prototype submission for ABB Accelerator 2026. It does not imply ABB endorsement, deployment, partnership, or production use.
