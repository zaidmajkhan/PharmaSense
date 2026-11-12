# PharmaSense

A hypertension-focused drug-reference and label-scan prototype built with Expo
(React Native). Drug data is cached locally in SQLite — seeded once from OpenFDA
and RxNorm — and the app never calls those APIs during normal use.

**Not medical advice. Prototype only.** Check with your pharmacist or doctor
before changing medications, diet, or treatment. Blood-pressure flags are a
small curated list for education demos and must be reviewed by a licensed
pharmacist before any real use.

## Tabs

- **Home** — hypertension dashboard with a prominent **Scan a label** button,
  **My medications** and **Sodium watch** summaries, Drug of the Day, and
  recently viewed drugs.
- **Ask AI** — chat with Claude, grounded exclusively in the local drug cache.
  It explains cached drug info in plain language, or suggests general OTC drug
  *categories* (never brands, strengths, or doses) for mild symptoms. Dosing
  text stays on the drug screen and is not sent to the model. Every symptom
  answer includes a "see a doctor if…" note, and severe symptoms get a
  doctor/urgent-care recommendation instead of an OTC suggestion. The thread
  is saved on the device and can be cleared from the header.
- **Scan** — camera capture (or photo library fallback) of medication and
  nutrition labels. Images are sent to the Expo API route
  `src/app/api/scan+api.ts` for vision extraction. Photos are **not saved** on
  the device or server; they are processed in memory and discarded after the
  response. The scan screen reminds you: avoid including your name or address
  in the frame.
- **Search** — search the local cache by name, class, or brand; results open
  the full drug screen (with **Add to My medications**).
- **Flashcards** — swipeable flip cards (front: name + class; back: uses +
  side effects) that resume where you left off.

Related stack screens: **Scan result**, **My medications**, About/safety, and
Privacy.

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

## How label scan works

Scan posts base64 image data to `src/app/api/scan+api.ts`, which:

- validates mime type and payload size,
- rate-limits per install id and per IP,
- calls Claude with vision using the same server-side `ANTHROPIC_API_KEY`,
- returns structured JSON only (`labelType`, medication fields, nutrition /
  sodium fields, `confidence`, `rawText`, `reason`),
- does **not** log image data or `rawText`.

Medication results are matched against the on-device SQLite drug cache. Curated
blood-pressure relevance flags come from `src/data/bp-flags.json` only — never
from freeform model text. Nutrition results compare sodium per serving to
2,300 mg (common daily limit) and 1,500 mg (ideal limit) references; you can
log items into a local daily sodium total that resets by calendar date.

## Privacy

- No accounts and no cloud sync for medications or sodium logs.
- Scan images are not stored; process in memory only.
- Prescription labels can contain a patient’s name and address — keep those out
  of the frame when possible.
- No analytics or tracking SDKs.

## Website demo (no phone required)

PharmaSense runs in the browser for demos and lab presentations:

```bash
npm install
cp .env.example .env   # then set ANTHROPIC_API_KEY
npm run demo:web
```

Open the local URL Expo prints (usually `http://localhost:8081`). On a laptop
the site shows a phone-framed demo; on a narrow window it is full-width. Use
**Scan → Upload label photo** on web (camera is for native builds).

To publish a shareable link (after `eas login` and project setup):

```bash
npm run deploy:server
```

That exports the web app and deploys it with EAS Hosting (same path as Ask AI /
Scan API hosting). Set `ANTHROPIC_API_KEY` in EAS env for the deployed demo.

## Setup

Requires Node.js LTS.

```bash
npm install
cp .env.example .env   # then set ANTHROPIC_API_KEY
npx expo start
```

`npx expo start` serves both the app and the API routes, so Ask AI and Scan
work in development without a separate backend.

Because this project uses `expo-camera` and `expo-image-picker` with
`expo-dev-client`, camera Scan needs a **dev build** (or a fresh native rebuild)
rather than a stock Expo Go binary that predates those plugins:

```bash
npx expo run:ios
# or
npx expo run:android
# or an EAS development build
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

## Checks

```bash
npm run lint
npm run typecheck
npm test          # unit tests: keyword matching, prompt context, ask/scan validation, drug match, bp flags, sodium math
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
- Blood-pressure flags and sodium references are educational prototypes.
- Individual sodium and medication plans vary — follow clinician guidance.
