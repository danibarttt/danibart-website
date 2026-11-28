---
name: verify
description: Build, launch, and drive this gallery site to verify changes end-to-end. Use when validating a UI, routing, i18n or photo-pipeline change instead of assuming it works.
compatibility: macOS with a Playwright browser cache; Node >= 22.12.
---

# Verifying danibart-website

## Launch

- `npm run dev` (background) — regenerates photos then serves on port 3000, or the next free port (watch the Vite banner for the actual URL).
- `generated_photos/` must exist or the gallery renders empty; `npm run dev`/`build` create it from `photos/`.
- A full regeneration is slow; the script is incremental, so a second run is cheap.

## Drive (headless browser)

No Playwright in the repo. Working recipe: install `playwright-core` into a scratch directory outside the repo (never as a dependency of the project), then launch with a cached binary:

```bash
mkdir -p /tmp/verify-danibart && cd /tmp/verify-danibart
npm install playwright-core
ls ~/Library/Caches/ms-playwright   # pick the newest chromium_headless_shell-<rev>
```

```js
const {chromium} = require("playwright-core");
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-<rev>/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
});
```

Resolution of the binary path differs per machine and per OS — always list the cache directory first rather than trusting the revision in this file.

`npm run dev` can serve on 3001+ if 3000 is taken: read the printed URL, do not hardcode the port.

## Flows worth driving

- Hero renders with background photo; nav buttons "Galleria"/"Chi sono" scroll (they are buttons calling `scrollIntoView`, not anchors — anchors would clash with the hash router).
- Click a `.gallery-item` → lightbox opens and URL becomes `#/?photo=<id>`; ArrowRight advances the id; Escape returns to `#/`.
- Deep link `#/?photo=<id>` opens the lightbox directly; a bogus id renders the page with no lightbox and no console errors.
- A `/p/<id>/` page loads as a real page (dev server serves it too), and Details from the lightbox lands on it.
- Descriptions: set `description` on a `photos.json` entry (dev server hot-reloads), check it appears at the bottom of the lightbox; revert after.
- Language/theme toggles: switching writes `lang`/`theme` to localStorage and survives a reload; picking the device default clears the override.
- Mobile: 390px viewport → single-column gallery, stacked about section, hamburger drawer works.

## Gotchas

- Screenshot after ~1.5s waits: images fade in on load and sections reveal on scroll.
- The hover caption sticks to whatever item sits under the (stationary) mouse after scrolling — that's normal hover behavior, not a bug.
- `photos.json` is rewritten by `generate-photos.js` (order, species separator): diff it after a run and don't fight the rewrite.
- Leave the repo clean: no `playwright-core` in `package.json`, no scratch scripts, no stray edits to `photos.json` from a test.
