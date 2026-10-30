# Evaluation

Run it yourself: `npm run eval` (needs a Qloo key). Qloo's terms keep response data out of public repositories, so this file holds aggregates only.

## Setup

Eight frozen personas, each with a birth year and two artists they loved: US 1946, UK 1942, Mexico 1950, India 1948, Greece 1947, Brazil 1949, Jamaica 1952, Italy 1944. Three arms, scored on the first six artists each would play.

| Arm | What it is |
| --- | --- |
| **memory-lane** | The shipped agent loop and engine |
| **anchors-only** | One Qloo Insights call from the named artists, same era and safety filters, no re-anchoring loop (an ablation of the agent) |
| **popularity** | What a plain "popular music" request returns: Qloo's most popular artists, no personal signal, no filters |

## Results (2026-10-24, live Qloo)

| Arm | Era fit | Upsetting themes | Safe in-era artists found (mean, min) | Overlap between personas | Latency |
| --- | --- | --- | --- | --- | --- |
| memory-lane | 100% | 0% | 21.4, 7 | 0.00 | 6.0 s cold |
| anchors-only | 100% | 0% | 17.6, 5 | 0.01 | 3.2 s cold |
| popularity | 17% | 83% | 3.0, 3 | 1.00 | none |

Audio previews: 46 of 48 planned songs (96%).

## How to read this

- **The big gap is personalization.** A generic popular list fits the person's youth 17% of the time, has an upsetting lyrical theme in 83% of its top six, and is identical for every persona (overlap 1.00). Memory Lane's lists share nothing across personas.
- **Era fit and theme safety are 100% and 0% for the two filtered arms by construction**, because they use the same filter. They show the filters work, not that the loop is better.
- **What the agent loop adds is depth.** It finds about 22% more safe in-era artists on average (21.4 against 17.6) and 7 against 5 in the worst persona. That matters for replacing upset songs without running out. It costs about 3 seconds on a cold start; repeat requests are cached and return in under a second.
- **What this does not show.** There is no human judgment of whether the songs are the ones this person would love. The checks are era, familiarity, lyrical themes, and audio availability, all from Qloo and iTunes fields. A blind review by caregivers is the missing evidence and is not claimed.

## A chatbot with no Qloo (2026-10-26)

`scripts/baseline.mts`, four personas (Greece 1947, Mexico 1950, India 1948, US 1946), the same model (`gpt-oss-120b`) in both arms, six songs each, live Qloo. The chatbot arm is asked for six songs from the person's years given the two artists they loved, with no Qloo. The Qloo arm is the shipped agent. Aggregates only.

| Metric (of 24 songs) | Chatbot, no Qloo | Memory Lane |
| --- | --- | --- |
| Songs by artists beyond the two named | 9 | 16 |
| Artists that are real | 23 | 24 |
| Song found in iTunes inside their years (title match, noisy) | 5 to 7 (two runs) | 9 |

- **Where Qloo clearly differs:** breadth. The chatbot mostly repeats the artists it was given (India: 0 of 6 beyond the two named). Qloo returns the surrounding scene, and each pick carries Qloo's explainability.
- **Where it does not:** a modern model does not invent famous artists, so "artists are real" is a tie. The card in the demo video says so.
- **Weak metric, not used in the demo:** "inside their years" matches song titles against iTunes, so it undercounts both arms and the gap is small. Era and safety are enforced by code in the Memory Lane arm; the chatbot arm has no such check.
- **Run to run:** the chatbot arm is not deterministic (artists real was 23 of 24 both times; years 5 then 7 of 24).

## Misses and caveats

- Lyrical themes and obscurity come from Qloo and are missing for some artists. Those pass the filter and are labelled "themes unknown" in the plan notes.
- Qloo's `notable_songs` sometimes names an album or a track iTunes lacks. The server tries the artist's other songs, then swaps the artist, which is why 4% of songs still have no preview.
- Films and shows are chosen by popularity within the window and are weaker cultural matches than the music (a rock documentary appeared for a Jamaican persona).
- Qloo's search results carry no era data, so named artists are dated through iTunes. An artist iTunes cannot date inside the window is left out, and the trace says so.

## Iteration log

| Change | Why |
| --- | --- |
| `null` end year read as 0 | Every active artist looked retired; caught by a unit test |
| Re-anchor on artists not yet used | Hop 3 repeated hop 2's query and added nothing |
| Named artists dated through iTunes | The first build dropped Frank Sinatra as "not active" because search results lack years |
| Songs without audio are swapped | A strip nobody can play defeats the demo |
| Same act under two names, same song under two spellings | "Bob Marley" and "Bob Marley & The Wailers" both played "No Woman, No Cry" |
| Song years replaced by the ages the artist was active | Qloo has no per-song dates; a made-up year would be false |
