# VayuVerse — Your Personal AI Clean-Air Navigator

> Built for PromptWars Virtual Challenge 6

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and add your keys
cp .env.example .env

# 3. Start development (frontend + API)
npm run dev
```

The app opens at **http://localhost:5173** with the API proxy at `/api/*` → `localhost:3001`.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start frontend (Vite) + backend (Express) concurrently |
| `npm run dev:frontend` | Start Vite dev server only |
| `npm run dev:api` | Start Express API server only |
| `npm run build` | Type-check + build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler (no emit) |
| `npm run test` | Run Vitest tests |

## Environment Variables

| Variable | Required | Source |
|---|---|---|
| `OPENAQ_API_KEY` | Yes | [openaq.org/register](https://openaq.org/register) |
| `GEMINI_API_KEY` | Yes | [aistudio.google.com](https://aistudio.google.com/apikey) |
| `SUPABASE_URL` | Later | Supabase project dashboard |
| `SUPABASE_ANON_KEY` | Later | Supabase project dashboard |

## Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Express dev server / Vercel serverless functions
- **Data:** OpenAQ v3 (station readings), Open-Meteo (forecasts + geocoding)
- **AI:** Google Gemini (evidence-based recommendations)
- **Auth:** Supabase (Phase 2+)

## Data Integrity

- Observed data always retains source, station ID, timestamp, and unit.
- Modeled forecasts are always labeled distinctly from station readings.
- AI interprets validated measurements — it never generates pollution numbers.
