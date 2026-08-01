// Vite dev-server plugin: serves the static HTML surface (/p/<id>/ and
// /s/<slug>/) while `npm run dev` is running.
//
// Those pages are a post-build step — src/generate-static-pages.mjs writes
// them into dist/ after `vite build` — so in dev they used to 404 (or, worse,
// fall through to the SPA index and render the gallery under a /p/ URL), and
// the lightbox's HQ and share buttons had to grow dev-only fallbacks.
//
// This runs the very same generator with STATIC_PAGES_DEV=1, which points the
// pages at generated_photos/ instead of the hashed bundle and writes them to
// .dev-static/, and then answers those two URL prefixes from there. Nothing
// here runs during a build (`apply: "serve"`).
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

import { LANGS, licensePath } from "./i18n.mjs";

const run = promisify(execFile);

const OUT_DIR = ".dev-static";
const GENERATOR = "src/generate-static-pages.mjs";

// Regenerating is a fraction of a second, but doing it per request would still
// be silly. These are every input the pages are built from — the manifest, the
// EXIF/blur metadata, and the modules that turn them into HTML — so a newer
// mtime on any of them is the signal to rebuild. Editing the generator while
// the dev server runs therefore shows up on the next reload.
const INPUTS = [
  "photos.json",
  "generated_photos/metadata.json",
  GENERATOR,
  "src/hero.mjs",
  "src/i18n.mjs",
  "src/photo-id.mjs",
  "src/regions.mjs",
  "src/species.mjs",
];

// Only the static surface, in either language. Everything else — the SPA, its
// assets, generated_photos/ — stays with vite's own middlewares.
//
// /p/ and /s/ keep their segment in both languages, so one pattern covers
// them. The license page is the one whose path is itself translated, so it is
// matched by name instead — with and without the trailing slash, since either
// spelling should reach it.
const STATIC_PATH = /^\/(en\/)?(p|s)\//;
const LICENSE_PATHS = new Set(
  LANGS.flatMap(lang => [licensePath(lang), licensePath(lang).replace(/\/$/, "")])
);
const isStaticPath = url => STATIC_PATH.test(url) || LICENSE_PATHS.has(url);

export default function staticPagesDev() {
  let root = process.cwd();
  let generatedAt = 0;
  let pending = null;

  const newestInput = () =>
    INPUTS.reduce((newest, file) => {
      const full = path.join(root, file);
      const mtime = fs.existsSync(full) ? fs.statSync(full).mtimeMs : 0;
      return Math.max(newest, mtime);
    }, 0);

  // One rebuild at a time: a page pulls in its own thumbnails and those of its
  // neighbours, so a handful of requests can arrive together on a cold start.
  const ensureFresh = () => {
    if (pending) return pending;
    const stamp = newestInput();
    if (stamp <= generatedAt) return Promise.resolve();
    pending = run(process.execPath, [GENERATOR], {
      cwd: root,
      env: { ...process.env, STATIC_PAGES_DEV: "1" },
    })
      .then(() => {
        generatedAt = stamp;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  return {
    name: "static-pages-dev",
    apply: "serve",
    configureServer(server) {
      root = server.config.root;
      // Added inside configureServer (not in a returned callback) so it runs
      // before vite's SPA fallback, which would otherwise answer /p/<id>/ with
      // index.html and render the gallery instead of the photo page.
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (req.method !== "GET" || !isStaticPath(url)) return next();

        try {
          await ensureFresh();
        } catch (error) {
          // The generator aborts loudly on bad input; show that instead of a
          // blank 404, since the page cannot exist until it is fixed
          server.config.logger.error(
            `[static-pages-dev] ${error.stderr || error.message}`.trimEnd()
          );
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`static page generation failed:\n\n${error.stderr || error.message}`);
          return;
        }

        // /p/<id> and /p/<id>/ both land on the same file — GitHub Pages
        // redirects the first to the second, and a hand-typed URL should not
        // depend on that
        const file = path.join(root, OUT_DIR, url, "index.html");
        // No such photo or species: 404 rather than falling through to vite's
        // SPA fallback, which would answer with the gallery — the built site
        // 404s here, and a typo in an id should look like one
        if (!file.startsWith(path.join(root, OUT_DIR)) || !fs.existsSync(file)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`no static page for ${url}`);
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(fs.readFileSync(file));
      });
    },
  };
}
