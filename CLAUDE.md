# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Memory Lane: a reminiscence-session planner for dementia caregivers, built for the Qloo hackathon. Songs, films, shows, books, places and meals from the years the person was ~10–30, found via the Qloo API. See `README.md` for the product flow, `PRODUCT.md` for boundaries and brand rules, `DESIGN.md` for the visual system (square corners, no pills, no em dashes in copy).

## Commands

```sh
npm run check      # tsc for the Worker (root tsconfig) AND the web app (-p web); both must pass
npm test           # node --test via tsx, offline (test/*.test.ts)
node --import tsx --test --test-name-pattern="era window" test/engine.test.ts   # single file / single test
npm run build      # vite build: web/ -> dist/ (the Worker serves dist/ as assets)
npm run dev        # wrangler dev on :8787 (needs a built dist/ and QLOO_API_KEY in .dev.vars)
npm run web        # Vite dev server on :5173, proxies /api to :8787
npm run e2e        # Playwright against a running server (BASE_URL overrides; live Qloo, real Chrome if installed)
npm run eval       # three-arm evaluation on 8 personas (live Qloo; prints aggregates only)
npx wrangler d1 migrations apply memory-lane --local   # first-time local DB setup
```

CI runs `check`, `test`, `build`. `e2e` and `eval` hit live Qloo and are not in CI. The e2e also enforces design rules: no border-radius over 8px, controls at least 44px tall, no horizontal scroll, no console errors.

## Architecture

One Cloudflare Worker (`src/`) plus a Vite/React SPA (`web/`). `wrangler.jsonc` sends only `/api/*` to the Worker first; everything else is static assets from `dist/` with SPA fallback. State is D1 (`sessions`, `qloo_cache`); a daily cron deletes expired rows (sessions live 30 days).

### The core split: Qloo finds, LLM chooses, code decides

- `src/qloo.ts`: Qloo HTTP client with a pluggable `Cache` (D1-backed in the Worker, in-memory in scripts/tests), artist search/resolution, and `runAgent` (the music hop-expansion over Qloo, up to 3 hops) plus iTunes lookups for previews and dated songs.
- `src/domains.ts`: Qloo Insights for film/TV/books/destinations/places. Every call is checked by `checkParams` against a per-type allowlist because Qloo silently ignores parameters that don't apply to an entity type. Extend `ALLOWED` when adding a parameter.
- `src/capsule.ts`: `gather` (always: Qloo evidence across domains) → `agentPlan` (Workers AI `gpt-oss-120b` calls a single `submit_plan` tool whose `execute` validates every id against the evidence and rejects with an error the model must fix) → `scripted` fallback (closest Qloo result per domain). `buildCapsule` ties them together; `requireAgent` (used by chat) turns an agent failure into a visible error instead of the fallback. Agent decisions are memoized in the cache for 7 days.
- `src/engine.ts`: deterministic core with no network or model calls: era window (`born+10..born+30`), `safety` (obscurity, complexity, upsetting themes), `mediaSafe` regex screen, `buildPlan`, `applyReaction`, `refill`, `validate`. This is where "what is safe to play" lives; the agent can only choose among what passes it.
- `src/worker.ts`: routes, session persistence, and `playable`/`withPreviews` (swap in the next eligible artist if iTunes has no audio). Session creation and chat stream NDJSON (`step` lines, then `done` or `error`) when the request sends `Accept: application/x-ndjson`; the web client parses it with `web/src/lib/ndjson.ts`.

Sessions are a single JSON blob in `sessions.body` with optimistic concurrency: every mutation does `UPDATE ... WHERE version = ?` and returns 409 if it lost the race. A session stores the whole `pool` so reactions and re-plans (`refill`) work without re-calling Qloo.

### Invariants worth preserving

- A Qloo failure is surfaced, never replaced by a generic list. Unknown start year ⇒ excluded from the era window. The LLM can never introduce an item Qloo didn't return.
- Reactions: `upset` bans the artist for that session and records it in `avoid`; `smiled` and `upset` reweight genres. Reactions never leak across sessions.
- `/api/_baseline` is evaluation-only and works only on localhost.
- Qloo's terms keep raw responses out of the repo; don't commit fixtures or dumps of them.

### Web app

React 19 + react-router + framer-motion + Tailwind 4. Routes: `/` Landing, `/app` Setup, `/app/:id` Player, `/book/:id` Memory Book (print-friendly), `/privacy`. Types shared with the API are mirrored by hand in `web/src/lib/types.ts` (no shared package), so change both sides together. `web/` has its own `tsconfig.json`; `npm run check` covers it.

## Config

Secret `QLOO_API_KEY` goes in `.dev.vars` (local) or `wrangler secret put` (prod). Workers AI (`AI` binding) runs on the free daily allowance; when exhausted the app falls back to the scripted planner and says so in the Memory Book. `worker-configuration.d.ts` is generated and gitignored.
