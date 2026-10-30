# Judge audit

| Requirement | Evidence |
| --- | --- |
| Functional demo, no login | https://memory-lane.encore-tanishmisra9.workers.dev, "Greece, 1947" on the landing page loads a live Qloo session in one tap |
| Public repo with visible license | https://github.com/tanishmisra9/memory-lane, MIT |
| Description | `docs/submission-draft.md` |
| Hosted, not local | Cloudflare Worker with D1 |
| Qloo is load-bearing | Remove Qloo and no artists, films or shows are found; the app reports the failure |

## Skeptical checks

- Production never substitutes a generic list: a Qloo failure returns an error message (`test/qloo.test.ts`).
- No health data is requested or stored; the form has four fields.
- Every number in the write-up comes from `npm run eval`, `npm test`, or the browser test.
- Qloo data stays out of the repo: docs name no Qloo results, and the cache lives in D1.
- The key is in `.dev.vars` (ignored) and a Cloudflare secret, never in the tree or history.

## Front end (v2)

- Pages: `/` landing, `/app` setup and live trace, `/app/:id` full-screen player, `/book/:id` Memory Book, `/privacy`.
- The live trace is the real agent output, streamed as newline-delimited JSON from the Worker.
- `npm run e2e` covers the whole flow in real Chrome at 1280 and 390 wide against production.
- The Impeccable detector (full mode) reports 0 findings on `web/`.

## Agent and Qloo breadth (v3)

- Qloo calls: Search, Tags, Insights (artist, movie, tv_show, book, destination, place) with explainability, release- and publication-year filters, location and restaurant-genre tags; each checked against a per-type allowlist.
- The agent chooses only ids Qloo returned; `submit_plan` is validated in code (their years, familiarity, themes, real ids) and retried.
- Books, films and shows are screened for violence, war and tragedy.
- Free Workers AI allowance is 10,000 neurons a day. When it is spent the app falls back to Qloo's closest-result ranking and the Memory Book says the agent was not used.
- Measured 2026-10-26: the Qloo-grounded agent against an LLM-only baseline (`scripts/baseline.mts`, results in `docs/evaluation.md`). Qloo's clear gain is breadth (16 of 24 songs beyond the two named artists, against 9 of 24); artists being real is a tie.
