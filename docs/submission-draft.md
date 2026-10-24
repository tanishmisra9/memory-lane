# Memory Lane submission

## Tagline

**The right song isn't the popular one. It's the one from when they were 19.**

## Opening scene

Sunday afternoon at the care home. A daughter pulls up "oldies" for her father and gets songs he never heard. He looks out the window. Later someone plays a song he danced to at 19, and he starts tapping the table.

For many people with dementia, music from their teens and twenties is among the last things that stays familiar. That window, roughly ages 10 to 30, is known as the reminiscence bump, and it is well documented in healthy adults; evidence in dementia is smaller but points the same way ([Kaiser and Berntsen, 2022](https://pure.au.dk/ws/files/338096928/WIRES_Cognitive_Science_-_2022_-_Kaiser.pdf)). More than 55 million people live with dementia worldwide ([WHO](https://www.who.int/news-room/fact-sheets/detail/dementia)), and almost all of their caregivers are families with no way to find the right songs.

## Why the obvious approach fails

A search for "oldies" returns what was popular for everyone, in one country. A language model invents plausible titles. Neither knows this person's culture, decade, or taste. Measured on Qloo's data, a generic popular list fits a person's youth 17% of the time and puts an upsetting lyrical theme in 83% of its top six.

**Thesis: Qloo finds what someone's tastes are close to, plain code decides what is safe and from their years, and every reaction reshapes the next session.**

## What it does

1. **Landing:** one idea and one button. A moving era picture shows the thesis: a person born in 1946 is moved by music from 1956 to 1976.
2. **Setup:** three short screens. A caregiver gives an optional first name, a birth year, and one to three artists the person loved (autocomplete from Qloo with artist photos, or a starter shelf for 12 countries).
3. **Tuning:** the agent's real trace streams in live: what it asked Qloo, how many artists it kept and set aside, and when it went back for more. Nothing is simulated.
4. **Player:** full screen, one song at a time. Cover art, an era timeline that places the song in their life, a 30-second preview, and Smiled / Okay / Upset with number-key shortcuts. Smiled and Okay open a one-line note ("What does this bring up?"). Upset replaces the song at once. A "Why this" drawer shows where the song came from, why it is from their youth, and what was checked.
5. **Memory Book (what comes out):** a page for family and care staff that says what worked, what is neutral, what to avoid and what was not tried; every song, film and show on one timeline of their years (points for dated songs, bars for artists known only by active years); the words the caregiver wrote; and links to keep playing in Spotify or Apple Music. Print it, share the link, or delete it.

## How Qloo is used, and what breaks without it

Search resolves the artists the caregiver names. Insights returns artists, films and shows near them, across a culture Memory Lane has no list for (the Greek, Mexican, Indian, Brazilian and Jamaican examples need no hand-built data). Without Qloo there is no way to go from "Nana Mouskouri" to Manos Hadjidakis and George Dalaras; the app shows Qloo's failure instead of a generic list.

## LLM versus code

There is no language model. Qloo supplies candidates. Code decides era (born +10 to +30, unknown years excluded), familiarity, gentle themes, audio availability, de-duplication, and how reactions change the plan. Prompts are fixed templates filled with real titles. The caregiver decides everything else.

## Evaluation

Eight personas, three arms (full table in `docs/evaluation.md`). A generic popular list fits the person's era 17% of the time, has upsetting themes in 83% of its top six, and is identical for every persona. Memory Lane's lists are era-fit and share nothing across personas. The agent loop finds about 22% more safe in-era artists than a single Qloo call (21.4 against 17.6 on average, 7 against 5 at the minimum). Audio previews exist for 96% of songs. Not shown: whether the songs are the right ones for a real person. That needs caregivers, and it is not claimed.

## Challenges

- The first web version scrolled like a static page and nothing came out of it. We rebuilt it as separate pages with a full-screen player and a Memory Book, and added a live trace so the wait shows the work.
- A `null` end year became 0, so every active artist looked retired. A unit test caught it.
- Qloo's search results carry no era fields, so the first build dropped Frank Sinatra as "not active". Named artists are now dated through iTunes.
- The agent's third round repeated its second query until it re-anchored on artists it had not used.
- "Bob Marley" and "Bob Marley & The Wailers" both played "No Woman, No Cry" in one session.
- The Discord version of this project (archived on `v1-discord`) needed a server, a bot invite and a location handoff. Judges could not try it, so we rebuilt it as a page.

## Qloo criteria

| Criterion | How Memory Lane answers it |
| --- | --- |
| Technological implementation | Qloo Search, Insights across artists, movies and TV, release-year window, explainability for "found through", a re-anchoring agent loop, a deterministic safety engine, 19 tests, a real-browser test, a three-arm evaluation |
| Design | Paper-and-ink system with hard offset shadows, separate landing, setup, player and book pages, one idea per screen, 44px targets, AA contrast, no pills, light and night themes, mobile first |
| Potential impact | Family caregivers of the 55 million-plus people with dementia; free, no login; the Memory Book gives care staff a page they rarely get (what works and what to avoid) |
| Quality of the idea | Cultural intelligence where a generic model fails: era-anchored, culture-aware, safety-screened reminiscence |

## Honest limits

Not therapy and makes no medical claim. No per-song year for found artists, so it shows ages. Films and shows are weaker matches. No human review of the songs yet. Qloo's hackathon key is rate-limited; repeated lookups are cached on the server.
