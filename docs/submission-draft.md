# Memory Lane submission

## Tagline

**The right song isn't the popular one. It's the one from when they were 19.**

## Opening scene

Sunday afternoon at the care home. A daughter pulls up "oldies" for her father and gets songs he never heard. He looks out the window. Later someone plays a song he danced to at 19, and he starts tapping the table.

For many people with dementia, music from their teens and twenties is among the last things that stays familiar. That window, roughly ages 10 to 30, is known as the reminiscence bump, and it is well documented in healthy adults; evidence in dementia is smaller but points the same way ([Kaiser and Berntsen, 2022](https://pure.au.dk/ws/files/338096928/WIRES_Cognitive_Science_-_2022_-_Kaiser.pdf)). More than 55 million people live with dementia worldwide ([WHO](https://www.who.int/news-room/fact-sheets/detail/dementia)), and almost all of their caregivers are families with no way to find the right songs.

## Why the obvious approach fails

A search for "oldies" returns what was popular for everyone, in one country. A language model invents plausible titles. Neither knows this person's culture, decade, or taste. Measured on Qloo's data, a generic popular list fits a person's youth 17% of the time and puts an upsetting lyrical theme in 83% of its top six.

**Thesis: an agent reads Qloo's taste graph across music, film, TV, books, places and food to rebuild one person's cultural world at 19. Qloo supplies the culture, the agent chooses from it, and plain code decides what is safe and from their years.**

## What it does

1. **Landing:** one idea and one button, with an animated picture of an age marker moving through their years.
2. **Setup:** three short screens: an optional first name, the birth year, and one to three artists they loved (with Qloo artist photos), plus an optional city for a taste-of-home restaurant.
3. **Tuning:** the agent's real work streams live: each Qloo query, how many results were kept and set aside, and the cultural reading ("Qloo reads their culture as Laiko, Greek Folk, Entehno").
4. **Player:** full screen, one item at a time: songs with previews and exact years, films, shows, a book, a place to revisit, and a restaurant near them with its photo. Smiled / Okay / Upset, a one-line note, and a "Why this" drawer that shows Qloo's cultural thread and closeness shares.
5. **Tell the agent:** the caregiver says what they see ("he gets sad at slow songs") and the agent goes back to Qloo and re-plans, keeping what made them smile and avoiding what upset them.
6. **Memory Book (what comes out):** a page for family and care staff: what worked, what to avoid, their cultural profile, how the agent chose and why, every item on a timeline of their years, their words, and links to keep playing.

## How Qloo is used, and what breaks without it

Memory Lane never asks about ethnicity, language or heritage. Qloo reads the person's cultural identity from the artists the caregiver names, and every screen shows that reading:

- **Search** resolves the named artists, with an exact-name guard because Qloo's search is fuzzy.
- **Insights, with explainability** returns artists, films and shows near them across a culture Memory Lane has no list for. Each result carries Qloo's own breakdown of which named artist pulled it in ("closest to Nana Mouskouri 54%, Mikis Theodorakis 46%"), shown in the "Why this" drawer.
- **Cultural properties** on each artist (genre scenes such as Laiko, Ranchera or Playback Singing; influences; place of origin; Qloo's cultural-impact summary; how its listeners are described) become a **cultural profile** of the person: streamed live while it builds ("Qloo reads their culture as Laiko, Greek Folk, Entehno, shaped by Greek Folk Traditions, Édith Piaf"), shown per song, and printed in the Memory Book for care staff.
- **Release-year filtering across movies and TV**, ranked by Qloo's affinity, so a Greek listener's film is the one Qloo places closest to Greek artists, not the most famous title.
- Familiarity (obscurity), lyrical themes and active years from Qloo drive the safety rules.

Without Qloo there is no way to go from "Nana Mouskouri" to Manos Hadjidakis, Laiko and Entehno, or from "Vicente Fernández" to Ranchera, Mariachi and Los Tigres del Norte. The app shows Qloo's failure instead of a generic list.

## LLM versus code

Qloo supplies the evidence. An LLM agent (Workers AI) chooses from it and explains why, and can only name ids Qloo returned. Code decides era (born +10 to +30, unknown years excluded), familiarity, gentle themes, audio availability, de-duplication, and how reactions change the plan. Prompts are fixed templates filled with real titles. If the model is unavailable the closest Qloo result in every domain is used. The caregiver decides everything else.

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
