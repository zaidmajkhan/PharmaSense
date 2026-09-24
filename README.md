# PharmaSense

A drug-reference and OTC-guidance app built with Expo (React Native). All drug
data is cached locally in SQLite — seeded once from OpenFDA and RxNorm — and the
app never calls those APIs during normal use.

## Tabs

- **Home** — deterministic "Drug of the Day", quick stats (flashcards reviewed,
  AI queries this week), shortcuts, recently viewed drugs, and an About and
  safety page.
- **Ask AI** — chat with Claude, grounded exclusively in the local drug cache.
  It explains cached drug info in plain language, or suggests general OTC drug
  *categories* (never brands, strengths, or doses) for mild symptoms. Dosing
  text stays on the drug screen and is not sent to the model. Every symptom
  answer includes a "see a doctor if…" note, and severe symptoms get a
  doctor/urgent-care recommendation instead of an OTC suggestion. The thread
  is saved on the device and can be cleared from the header.
- **Search** — search the local cache by name, class, or brand; results open
  the full drug screen.
- **Flashcards** — swipeable flip cards (front: name + class; back: uses +
  side effects) that resume where you left off.

All searches, views, flashcard reviews, and AI queries are logged to a local
`usage` table that powers the Home-tab stats. New installs see a one-time
safety acknowledgment before the tabs.

## How Ask AI reaches Claude

The app never holds an Anthropic key. Ask AI posts to the Expo API route
`src/app/api/ask+api.ts`, which:

- validates the request (at most 20 messages of 2,000 characters, at most 8
  RxNorm ids),
- rate-limits per install id and per IP (per server worker, so treat it as a
  first layer),
- looks up drug context by RxNorm id from its own copy of `drugs.json`, so a
  modified client cannot inject made-up "cached" drug text,
- calls Anthropic with the server-side `ANTHROPIC_API_KEY`.

## Setup

Requires Node.js LTS.

```bash
npm install
cp .env.example .env   # then set ANTHROPIC_API_KEY
npx expo start
```

`npx expo start` serves both the app and the API route, so Ask AI works in
development without a separate backend.

The repo ships with a pre-seeded cache (`src/data/drugs.json`, 200 common OTC
and prescription drugs). Each record is tied to an RxNorm RxCUI and, when the
label has them, brand names from OpenFDA. To refresh it from those databases:

```bash
npm run seed
```

`npm run seed:py` runs the same refresh with Python if Node is not on your PATH.

The app imports the JSON into the on-device SQLite database on first launch
(and re-imports whenever the seed file changes).

## Checks

```bash
npm run lint
npm run typecheck
npm test          # unit tests: keyword matching, prompt context, request validation
npm run test:ai   # live Anthropic boundary checks; needs ANTHROPIC_API_KEY
```

`test:ai` exercises the live API with the app's exact system prompt and
context injection, and checks that drug explanations stay grounded in cached
data, mild symptoms get OTC categories plus a "see a doctor if…" note,
specific dose/brand requests are refused, and severe symptoms are redirected
to a doctor or urgent care. CI runs lint, typecheck, and unit tests on every
push; `test:ai` runs only from a manual workflow trigger.

## Deploying and building

One-time setup:

```bash
npm install -g eas-cli
eas login
eas init                       # writes the project id into app.json
eas env:create --name ANTHROPIC_API_KEY --environment production --visibility secret
eas env:create --name ANTHROPIC_API_KEY --environment preview --visibility secret
npm run deploy:server          # first server deploy (export web + eas deploy)
```

Builds (the `preview` and `production` profiles set
`EXPO_UNSTABLE_DEPLOY_SERVER=1`, so each build deploys and links its own
server version):

```bash
eas build --profile preview -p android      # internal APK
eas build --profile production -p ios       # App Store build
eas submit -p ios                           # upload to TestFlight
```

The privacy policy is the `/privacy` route. After deploying, link
`https://<your-deployment>.expo.app/privacy` in the store listings.

## Notes

- Drug data is informational only and not medical advice.
