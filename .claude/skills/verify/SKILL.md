---
name: verify
description: Build, launch, and drive this gallery site to verify changes end-to-end.
---

# Verifying danibart-website

## Launch

- `npm run dev` (background) — regenerates photos then serves on port 3000, or the next free port (watch the Vite banner for the actual URL).
- `generated_photos/` must exist or the gallery renders empty; `npm run dev`/`build` create it from `photos/`.

## Drive (headless browser)

No Playwright in the repo. Working recipe: `npm install playwright-core` in the scratchpad, then launch with the cached binary:

```js
const {chromium} = require("playwright-core");
const browser = await chromium.launch({
  executablePath: "/Users/daniele/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell",
});
```

(Adjust the `chromium_headless_shell-*` revision to whatever `ls ~/Library/Caches/ms-playwright` shows.)

## Flows worth driving

- Hero renders with background photo; nav buttons "Galleria"/"Chi sono" scroll (they are buttons calling `scrollIntoView`, not anchors — anchors would clash with the hash router).
- Click a `.gallery-item` → lightbox opens and URL becomes `#/?photo=<id>`; ArrowRight advances the id; Escape returns to `#/`.
- Deep link `#/?photo=<id>` opens the lightbox directly; a bogus id renders the page with no lightbox and no console errors.
- Descriptions: set `description` on a `photos.json` entry (dev server hot-reloads), check it appears at the bottom of the lightbox; revert after.
- Mobile: 390px viewport → single-column gallery, stacked about section.

## Gotchas

- Screenshot after ~1.5s waits: images fade in on load and sections reveal on scroll.
- The hover caption sticks to whatever item sits under the (stationary) mouse after scrolling — that's normal hover behavior, not a bug.
