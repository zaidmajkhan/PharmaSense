# PharmaSense

**Hypertension-focused medication + nutrition label-scan prototype**  
Built with Expo (React Native) + TypeScript. Runs as a **phone app** and as a **browser demo**.

Drug facts are cached locally in SQLite (seeded from OpenFDA and RxNorm). The app does not call those APIs during normal use.

> **Not medical advice. Prototype only.**  
> Check with a pharmacist or doctor before changing medications, diet, or treatment. Blood-pressure flags are a small curated list for education demos and must be reviewed by a licensed pharmacist before any real use.

---

## Quick start (website demo — easiest way to show it)

No phone or Apple/Android build required.

```bash
git clone https://github.com/zaidmajkhan/PharmaSense.git
cd PharmaSense
npm install
cp .env.example .env
```

Edit `.env` and set:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```bash
npm run demo:web
```

Open the URL Expo prints (usually `http://localhost:8081`).

- On a **laptop**, the site shows a phone-framed demo.
- On a **narrow window / phone browser**, it is full width.
- On web, use **Scan → Upload label photo** (camera is for native builds).

### Share a public link

```bash
npm install -g eas-cli
eas login
eas env:create --name ANTHROPIC_API_KEY --environment production --visibility secret
npm run deploy:server
```

That exports the web app and deploys it with EAS Hosting (same host serves Ask AI + Scan APIs).

---

## What it does

| Feature | What you can demo |
| --- | --- |
| **Home** | Hypertension dashboard: Scan CTA, My medications, Sodium watch, Drug of the Day, recent drugs |
| **Scan** | Medication + nutrition labels via camera (native) or photo upload (web) |
| **BP flags** | Curated warnings (e.g. decongestants, NSAIDs) from `src/data/bp-flags.json` — never freeform AI |
| **Sodium watch** | Sodium vs 2,300 mg / 1,500 mg references; log items for today (local only) |
| **My medications** | Local list from scans or Search; remove anytime; no accounts |
| **Ask AI** | Claude grounded in the local drug cache (no invented doses/brands) |
| **Search** | Name / class / brand search of 200 cached drugs |
| **Flashcards** | Study cards for the local cache |

Related screens: Scan result, My medications, About/safety, Privacy.

---

## Privacy (short version)

- No accounts and no cloud sync for meds or sodium logs.
- Scan images are **not saved** — processed in memory, then discarded.
- Keep patient name/address out of the camera frame when possible.
- No analytics or tracking SDKs.
- API keys stay on the server (`.env` / EAS secrets), never in the client bundle.

Full policy: in-app `/privacy` route.

---

## How Ask AI works

The app never holds an Anthropic key. Ask AI posts to `src/app/api/ask+api.ts`, which:

1. Validates the request (message limits + RxNorm ids)
2. Rate-limits per install id and per IP
3. Looks up drug context from the server copy of `drugs.json`
4. Calls Anthropic with `ANTHROPIC_API_KEY`

Safety behavior: no doses/brands from the model, “see a doctor if…” notes, severe symptoms redirect to care.

---

## How label scan works

Scan posts image data to `src/app/api/scan+api.ts`, which:

1. Validates mime type and size
2. Rate-limits per install id and per IP
3. Calls Claude vision with the same server-side key
4. Returns structured JSON only (`labelType`, medication fields, nutrition/sodium fields, `confidence`, `rawText`, `reason`)
5. Does **not** log image bytes or `rawText`

Then on device/browser:

- Medication names are matched against the local SQLite cache
- BP flags come only from curated `bp-flags.json`
- Nutrition sodium can be logged to today’s local total

---

## Native phone setup (optional)

Requires Node.js LTS.

```bash
npm install
cp .env.example .env   # set ANTHROPIC_API_KEY
npx expo start
```

`npx expo start` serves the app and API routes together.

Because this project uses `expo-camera`, `expo-image-picker`, and `expo-dev-client`, camera Scan needs a **dev/native build**:

```bash
npx expo run:ios
# or
npx expo run:android
# or
eas build --profile development -p ios
eas build --profile preview -p android
```

### Drug cache

The repo ships `src/data/drugs.json` (200 common OTC + prescription drugs) with RxNorm RxCUIs and brand names when available.

```bash
npm run seed      # refresh from OpenFDA / RxNorm (Node)
npm run seed:py   # same, Python
```

The app imports JSON into on-device SQLite on first launch (and when the seed file changes).

---

## Checks

```bash
npm run lint
npm run typecheck
npm test          # unit tests (ask/scan validation, drug match, bp flags, sodium math, …)
npm run test:ai   # live Anthropic boundary checks (needs ANTHROPIC_API_KEY)
```

CI runs lint, typecheck, and unit tests on every push. `test:ai` is manual-only.

---

## Deploy / store builds

```bash
npm install -g eas-cli
eas login
eas init
eas env:create --name ANTHROPIC_API_KEY --environment production --visibility secret
eas env:create --name ANTHROPIC_API_KEY --environment preview --visibility secret
npm run deploy:server

eas build --profile preview -p android      # internal APK
eas build --profile production -p ios       # App Store / TestFlight path
eas submit -p ios
```

After deploy, use `https://<your-deployment>.expo.app/privacy` in store listings.

---

## Project layout (high level)

```
src/app/(tabs)/     Home, Ask AI, Scan, Search, Flashcards
src/app/api/        ask+api.ts, scan+api.ts (server routes)
src/data/           drugs.json, bp-flags.json
src/db/             SQLite helpers (meds, sodium, usage)
src/server/         Anthropic + request validation / rate limits
tests/              Jest unit tests
```

---

## Notes for demos

1. Start with the **website demo** (`npm run demo:web`) if you cannot install on a phone yet.
2. Have a clear medication label photo and a Nutrition Facts photo ready for Scan upload.
3. Say clearly: prototype, local cache, curated BP flags, not clinical software.
4. iOS native demos later need a Mac + Apple Developer account; Expo/React Native is the shared codebase for both platforms.
