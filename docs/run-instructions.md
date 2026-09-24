# Instructions to Run

**Prerequisites:** Node.js 20.9 or newer and npm. No API keys, environment variables, database, or backend are required. The first build downloads fonts from Google Fonts, so internet access is needed.

**Install:**

```bash
npm install
```

**Development run:**

```bash
npm run dev
```

Open http://localhost:3000. It redirects to the **Overview** page. Other pages: Infrastructure, Restoration Plan, Scenarios (use the left sidebar).

**Production build and run:**

```bash
npm run build
npm start
```

Then open http://localhost:3000.

**Optional checks:** `npm test` (needs Node.js 22.18+), `npm run typecheck`, `npm run lint`.

All data is simulated prototype data. This is decision-support software: AI recommends, engineers decide.
