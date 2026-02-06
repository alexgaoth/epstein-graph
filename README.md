# Epstein Connection Graph

Interactive relationship graph visualization based on public DOJ documents related to the Jeffrey Epstein case. Built with React, TypeScript, Sigma.js v2 (WebGL), and ForceAtlas2 layout.

## Quick Start

```bash
npm install
npm run dev      # Development server (Vite, hot reload)
```

## Production Build & Run

```bash
npm install
npm run build    # Vite production build → dist/
npm start        # Express serves dist/ on port 3000
```

## Features

- **Force-directed WebGL graph** — Sigma.js v2 with ForceAtlas2 physics layout
- **Click-to-center camera animation** — smooth `camera.animate()` with quadraticOut easing
- **Node focus + neighbor highlighting** — click any node to center, highlight connections, fade others
- **Edge click → info panel** — shows connection type, DOJ document title, quote snippet, and source link
- **Search** — find any person by name; Enter centers the result
- **Keyboard navigation** — arrow keys step through neighbors; Escape resets view; `/` or `Ctrl+K` focuses search
- **Minimap** — overview in top-right corner
- **Mobile gestures** — pinch-to-zoom and two-finger pan supported via Sigma's touch handling
- **Dark investigative theme** — minimal chrome, thin typography, subtle glow effects

## Data

The graph data lives in `public/data/graph.json` with 21 nodes (Jeffrey Epstein + 20 associated individuals) and 25 edges. Each edge includes:

- `connection_type` — one of: named in document, flight record, testimony mention, financial record, photograph, other
- `doj_link` — URL to DOJ source at justice.gov
- `document_title` — title of the source document
- `quote_snippet` — relevant excerpt (when available)

### Data Harvesting

To regenerate graph data from live DOJ pages:

```bash
npm run fetch-data
```

This runs `scripts/fetch_doj.js` which:
1. Crawls justice.gov/usao-sdny case pages (respects robots.txt, 2s delays)
2. Extracts PDF document links
3. Parses PDFs for name mentions using exact-match
4. Builds `public/data/graph.json` and `data/harvest-report.json`

**Legal note:** This script fetches publicly available documents from justice.gov. The DOJ makes these documents available to the public. The script includes respectful crawl delays and identifies itself via User-Agent.

## Railway Deployment

### Option 1: One-click with railway.json

1. Push to GitHub
2. Connect repo in [Railway](https://railway.app)
3. Railway auto-detects `railway.json` — builds and deploys

### Option 2: Manual setup

1. Create a new project on Railway
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Railway assigns a `PORT` env variable automatically

### Option 3: Docker

```bash
docker build -t epstein-graph .
docker run -p 3000:3000 epstein-graph
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Graph rendering | Sigma.js v2 (WebGL) + Graphology |
| Layout | ForceAtlas2 (iterative, animated settling) |
| State | Zustand |
| Styling | Tailwind CSS 3 (dark theme) |
| Backend | Node.js + Express (static file server) |
| Data harvest | node-fetch + pdf-parse + cheerio |

## Architecture Notes

### Camera Animation (Quartz-like)

When a node is clicked, the camera centers on it using Sigma's camera API:

```typescript
// Get node position in graph coordinate space
const nodeDisplayData = sigma.getNodeDisplayData(nodeId);

// Animate camera to center the node with comfortable zoom
sigma.getCamera().animate(
  { x: nodeDisplayData.x, y: nodeDisplayData.y, ratio: 0.25 },
  { duration: 600, easing: 'quadraticOut' }
);
```

### Focus Highlighting

Node and edge reducers dynamically restyle the graph based on selection state:

```typescript
nodeReducer: (node, data) => {
  if (node === selectedNode) {
    return { ...data, size: 14, color: '#00d4ff', forceLabel: true };
  }
  if (neighbors.has(node)) {
    return { ...data, size: 9, color: '#3388bb', forceLabel: true };
  }
  // Fade non-neighbors
  return { ...data, size: 4, color: '#1c1c30', label: '' };
}
```

### ForceAtlas2 Animated Settling

Layout runs iteratively via `requestAnimationFrame` for the "jitter into place" effect:

```typescript
function layoutStep() {
  if (iterations < 180) {
    forceAtlas2.assign(graph, { settings, iterations: 1 });
    iterations++;
    requestAnimationFrame(layoutStep);
  }
}
```

## Tests

```bash
npm test
```

Tests cover:
- `findNameMentions` — exact name matching in document text
- `validateGraphSchema` — JSON schema validation for graph.json
