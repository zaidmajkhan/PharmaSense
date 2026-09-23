# PharmaSense

A drug-reference and OTC-guidance app built with Expo (React Native). All drug
data is cached locally in SQLite — seeded once from OpenFDA and RxNorm — and the
app never calls those APIs during normal use.

## Tabs

- **Home** — deterministic "Drug of the Day", quick stats (flashcards reviewed,
  AI queries this week), shortcuts, and recently viewed drugs.
- **Ask AI** — chat with Claude, grounded exclusively in the local drug cache.
  It explains cached drug info in plain language, or suggests general OTC drug
  *categories* (never brands, strengths, or doses) for mild symptoms. Dosing
  text stays on the drug screen and is not sent to the model. Every symptom
  answer includes a "see a doctor if…" note, and severe symptoms get a
  doctor/urgent-care recommendation instead of an OTC suggestion.
- **Search** — search the local cache by name; expandable cards show class,
  uses, dosing, side effects, interactions, and OTC/prescription status.
- **Flashcards** — swipeable flip cards (front: name + class; back: uses +
  side effects) that resume where you left off.

All searches, views, flashcard reviews, and AI queries are logged to a local
`usage` table that powers the Home-tab stats.

## Setup

```bash
npm install
cp .env.example .env   # then set EXPO_PUBLIC_ANTHROPIC_API_KEY
npx expo start
```

The repo ships with a pre-seeded cache (`src/data/drugs.json`, 200 common OTC
and prescription drugs). Each record is tied to an RxNorm RxCUI and, when the
label has them, brand names from OpenFDA. To refresh it from those databases:

```bash
npm run seed
```

`npm run seed:py` runs the same refresh with Python if Node is not on your PATH.

The app imports the JSON into the on-device SQLite database on first launch
(and re-imports whenever the seed file changes).

## Testing the AI safety boundaries

With an API key in `.env`:

```bash
node scripts/test-ai-boundaries.mjs
```

This exercises the live API with the app's exact system prompt and context
injection, and checks that: drug explanations stay grounded in cached data,
mild symptoms get OTC categories plus a "see a doctor if…" note, specific
dose/brand requests are refused, and severe symptoms are redirected to a
doctor or urgent care.

## Notes

- `EXPO_PUBLIC_*` env vars are inlined into the client bundle. That is fine for
  local development; route Anthropic calls through a backend proxy before any
  production release.
- Drug data is informational only and not medical advice.
