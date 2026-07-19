# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Daniele Bartorilla — Fotografia Naturalistica" — a single-page bird photography gallery (Vite + React 19), deployed to GitHub Pages by CI. All website text is in Italian; code, comments, and error messages are in English. No tests, no linter, no TypeScript; styling lives in `src/index.css` (design tokens as CSS variables, class-based styles) plus `src/lightbox.css`. Fonts (Cormorant Garamond + Inter) load from Google Fonts via `index.html`.

The page is: hero (the `hero: true` photo as background, in-page nav), gallery (responsive CSS-columns masonry with hover captions), "Chi sono" section, footer. The about-section portrait is optional: drop `src/profile.jpg` (or `.jpeg`/`.png`) and it is picked up via `import.meta.glob`; a placeholder shows otherwise. In-page nav must scroll programmatically (`scrollIntoView`), not via `#anchor` links, which would clash with the hash router.

## Commands

- `npm run dev` — start dev server on port 3000 (runs `generate-photos.js` first).
- `npm run build` — runs `node src/generate-photos.js`, `vite build`, then `node src/generate-social-pages.js` (post-build: per-photo Open Graph pages, see below).
- Deploy is automatic: every push to `main` triggers `.github/workflows/deploy.yml`, which builds and force-pushes `dist/` as a single orphan commit to the `deploy` branch (the GitHub Pages source for https://danibart.it). There is no manual deploy script.

## Photo pipeline (the key architecture)

Source JPGs live in `photos/` (committed). `src/generate-photos.js` uses sharp to produce `generated_photos/fullsize/` (quality 90 mozjpeg, progressive), `generated_photos/thumbnails/` (600px wide, jpg + webp — gallery `<picture>` prefers webp), `generated_photos/hero/` (1920px wide, jpg + webp, only for `hero: true` entries), `generated_photos/social/` (1200px wide, for the Open Graph pages), and `generated_photos/metadata.json` (per photo: pixel dimensions, a tiny base64 blur-up placeholder used by the gallery and hero, and shooting data parsed from EXIF via exif-reader — shown in the lightbox caption). `generated_photos/` is gitignored — it must be regenerated locally, and the app fails to show photos without it.

`photos.json` (repo root) is the single manifest: a hand-maintained ordered array of `{filename, title, species, description}` entries (array order = gallery display order; `species` is the optional Latin name, shown in the hover caption and lightbox; `description` may be empty and shows in the lightbox caption when set). One entry may carry `"hero": true` to become the hero background (falls back to the first entry). `src/photos.jsx` imports it and resolves URLs via `import.meta.glob`. **Adding a photo requires two steps:** drop the `.jpg` in `photos/` AND add an entry to `photos.json`. Each photo gets a stable URL id derived from `title` + MD5 of the filename.

`src/generate-social-pages.js` (run by `build` after vite) writes a static `dist/p/<id>/index.html` per photo with Open Graph tags (pointing at `dist/social/`) plus a redirect to the SPA deep link, and injects into `dist/index.html` the site-wide Open Graph tags and a `<link rel="preload">` for the hashed hero webp (the LCP). The lightbox share button hands out these `/p/<id>/` URLs so shared links unfurl with the photo; it duplicates the id computation, so keep it in sync with `src/photos.jsx`.

`src/generate-photos.js` (run by both `dev` and `build`) enforces a 1:1 match between `photos/*.jpg` and `photos.json` in both directions and aborts with a nonzero exit on any mismatch. Generation is incremental (skips existing outputs) and deletes stale outputs whose source photo was removed.
## Routing / lightbox

`App.jsx` uses a hash router (GitHub Pages compatibility) with a single `/` route rendering `Gallery.jsx`. The lightbox (yet-another-react-lightbox with Zoom + Captions plugins) is driven by the `?photo=<id>` query param, so individual photos are deep-linkable; navigation within the lightbox rewrites the param with `replace: true`.
