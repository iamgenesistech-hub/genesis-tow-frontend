# I AM GENESIS TOW — Frontend

React + Vite frontend for the Genesis Tow platform. Provides an instant quote calculator that connects to the backend API.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `` (empty, uses proxy) | Backend API base URL for production |

## Development

In dev mode, Vite proxies `/jobs` and `/health` requests to `http://localhost:3000` (your backend). Just run both:

- Terminal 1: `cd genesis-tow-backend && npm start`
- Terminal 2: `cd genesis-tow-frontend && npm run dev`

## Production Build

```bash
npm run build
```

Output goes to `dist/` — deploy as static files. Set `VITE_API_URL` to your deployed backend URL at build time.
