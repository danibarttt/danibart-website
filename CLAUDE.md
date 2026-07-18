# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Aironi e altro" — a single-page bird photography gallery (Vite + React 19), deployed to GitHub Pages via `gh-pages`. All UI text is in Italian. No tests, no linter, no TypeScript; styling is inline styles plus a few CSS files in `src/`.

## Commands

- `npm run dev` — start dev server on port 3000. Requires `generated_photos/` to exist first (see below); run `node src/generate-photos.js` once if it's missing, since `dev` does not generate it.
- `npm run build` — runs `node src/generate-photos.js` then `vite build`.
- Deploy is automatic: every push to `main` triggers `.github/workflows/deploy.yml`, which builds and force-pushes `dist/` as a single orphan commit to the `deploy` branch (the GitHub Pages source for https://danibart.it). `npm run deploy` exists as a manual fallback.

## Photo pipeline (the key architecture)

Source JPGs live in `photos/` (committed). `src/generate-photos.js` uses sharp to produce `generated_photos/fullsize/` (quality 100) and `generated_photos/thumbnails/` (600px wide, quality 70). `generated_photos/` is gitignored — it must be regenerated locally, and the app fails to show photos without it.

`photos.json` (repo root) is the single manifest: a hand-maintained ordered array of `{filename, title}` entries (array order = gallery display order). `src/photos.jsx` imports it and resolves URLs via `import.meta.glob`. **Adding a photo requires two steps:** drop the `.jpg` in `photos/` AND add an entry to `photos.json`. Each photo gets a stable URL id derived from `title` + MD5 of the filename.

`src/check-photos.js` enforces a 1:1 match between `photos/*.jpg` and `photos.json` in both directions; it runs before `dev` and `build` (via `generate-photos.js`) and aborts with a nonzero exit on any mismatch.

## Routing / lightbox

`App.jsx` uses a hash router (GitHub Pages compatibility) with a single `/` route rendering `Gallery.jsx`. The lightbox (yet-another-react-lightbox with Zoom + Captions plugins) is driven by the `?photo=<id>` query param, so individual photos are deep-linkable; navigation within the lightbox rewrites the param with `replace: true`.
