// Post-build step (after `vite build`). The SPA is a single JS-rendered page,
// so everything a crawler or a link preview should see is emitted here as
// plain HTML alongside it:
//
//   dist/p/<id>/index.html   one page per photo (Open Graph + real content)
//   dist/s/<slug>/index.html one page per species, plus dist/s/ as their index
//   dist/sitemap.xml         every static page, with its shooting date
//
// and the site-wide Open Graph tags and hero preload are injected into
// dist/index.html.
//
// The photo pages used to be redirect stubs that bounced into the SPA deep
// link. They are real pages now: a redirect is not indexable, and the static
// page paints the photo without waiting for the JS bundle. Each one links
// into the gallery for the full experience.
//
// With STATIC_PAGES_DEV=1 the same script runs against the dev server instead
// (see src/static-pages-dev.mjs, the plugin that calls it): the pages go to
// .dev-static/ and point at the unhashed files in generated_photos/, which
// vite serves straight from the project root. Everything that only makes
// sense for a real build — the sitemap, the tags injected into dist/index.html
// and the analytics tag — is skipped. This exists so /p/<id>/ can be opened
// and edited in dev instead of only after a build.
import fs from "fs";
import path from "path";

import { photoId } from "./photo-id.mjs";
import { findRegion, ITALY_PATH, MAP_VIEWBOX, REGION_PATHS } from "./regions.mjs";
import { collectSpecies, commonName, speciesSlug, splitSpecies } from "./species.mjs";

const DEV = process.env.STATIC_PAGES_DEV === "1";

const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "photos.json"), "utf8"));
const metadata = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "generated_photos/metadata.json"), "utf8")
);

const SITE = "https://danibart.it";
const SITE_NAME = "Daniele Bartorilla — Fotografia Naturalistica";
const SITE_DESCRIPTION =
  "Fotografia naturalistica di Daniele Bartorilla: aironi e altri uccelli delle zone umide.";
const EMAIL = "danielebartorilla@gmail.com";

const distDir = path.join(process.cwd(), "dist");
const assetsDir = path.join(distDir, "assets");
const socialInputDir = path.join(process.cwd(), "generated_photos/social");

// Where the pages land: dist/ for a build, a throwaway directory the dev
// server reads from otherwise. The dev one is wiped first so a renamed or
// deleted photo cannot leave a page behind that keeps answering.
const outDir = DEV ? path.join(process.cwd(), ".dev-static") : distDir;

if (DEV) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
} else if (!fs.existsSync(distDir)) {
  console.error("ERROR: dist/ not found — run vite build first");
  process.exit(1);
}

const escapeHtml = text =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Serialize JSON-LD for inline <script> embedding ("<" could otherwise
// close the script tag early)
const jsonLd = data => JSON.stringify(data).replace(/</g, "\\u003c");

const AUTHOR = {
  "@type": "Person",
  "@id": `${SITE}/#person`,
  name: "Daniele Bartorilla",
  url: `${SITE}/`,
};

/* ---------- shared photo helpers ---------- */

const meta = photo => metadata[photo.filename] ?? {};
const idOf = photo => photoId(photo);
const speciesOf = photo => (photo.species ? splitSpecies(photo.species) : []);
const altOf = photo => (photo.species ? `${photo.title} (${photo.species})` : photo.title);
const descriptionOf = photo =>
  photo.description || photo.species || "Fotografia naturalistica di Daniele Bartorilla";

const formatDate = iso =>
  new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

const formatExposure = seconds => (seconds >= 1 ? `${seconds}s` : `1/${Math.round(1 / seconds)}s`);

// Same shooting data the lightbox caption shows, as label/value pairs
const exifRows = photo => {
  const { exif = {}, dateTaken } = meta(photo);
  return [
    dateTaken && ["Scattata il", formatDate(dateTaken)],
    exif.camera && ["Fotocamera", exif.camera],
    exif.lens && ["Obiettivo", exif.lens],
    exif.focalLength && ["Focale", `${exif.focalLength}mm`],
    exif.fNumber && ["Diaframma", `ƒ/${exif.fNumber}`],
    exif.exposureTime && ["Tempo", formatExposure(exif.exposureTime)],
    exif.iso && ["ISO", String(exif.iso)],
  ].filter(Boolean);
};

/* ---------- where the photo was taken ---------- */

// The manifest's "position" field, shown as a card with a small map of Italy:
// the whole country in faint outlines, the region the photo was taken in
// filled with the accent. Inline SVG rather than a file — it costs no request
// and, being markup, it follows the theme tokens like everything else. The
// paths live in src/regions.mjs.
const PIN_ICON = `<svg class="place-pin" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 21.5c4.5-5.2 6.8-8.8 6.8-11.5a6.8 6.8 0 1 0-13.6 0c0 2.7 2.3 6.3 6.8 11.5z"/><circle cx="12" cy="10" r="2.6"/></svg>`;

const regionMap = region =>
  `<svg class="place-map" viewBox="${MAP_VIEWBOX}" width="62" height="73" role="img" aria-label="${escapeHtml(
    region
  )} evidenziata sulla mappa d'Italia"><path class="place-italy" d="${ITALY_PATH}" /><path class="place-region" d="${
    REGION_PATHS[region]
  }" /></svg>`;

// A position naming no Italian region (a foreign trip, or just something the
// lookup does not know) still gets a card — with a pin instead of a map.
const placeCard = photo => {
  const position = photo.position?.trim();
  if (!position) return "";
  const region = findRegion(position);
  // Foreign places land here legitimately, but so does a typo in an Italian
  // region — and the only visible difference is a pin instead of the map
  if (!region) {
    console.warn(`WARNING: position "${position}" (${photo.filename}) matches no Italian region`);
  }
  return `<figure class="place">
          ${region ? regionMap(region) : PIN_ICON}
          <figcaption>
            <span class="place-label">Scattata in</span>
            <b>${escapeHtml(position)}</b>
            ${region ? `<span class="place-country">Italia</span>` : ""}
          </figcaption>
        </figure>`;
};

/* ---------- hashed asset lookup ---------- */

// vite flattens every imported photo into dist/assets/<basename>-<hash>.<ext>,
// so renditions of the same photo collide by name: the 600px thumbnail, the
// full-size copy and the quality-100 original all end up as
// "IMG_6501-<hash>.jpg". They are matched back to their source by file size —
// vite copies assets byte for byte, so the sizes are identical. (This used to
// rank candidates by size and take the smallest or largest, which could not
// name the middle one at all.)
const generatedRoot = path.join(process.cwd(), "generated_photos");
const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const assetSizes = new Map(
  assetFiles.map(file => [file, fs.statSync(path.join(assetsDir, file)).size])
);

// relPath is relative to generated_photos/, e.g. "fullsize/IMG_6501.jpg".
// The name prefix narrows the candidates and the byte size picks the right one
// among them. Deliberately no attempt to parse the hash out of the filename:
// vite's hash alphabet includes "-", so "IMG_6501-1280-<hash>.jpg" cannot be
// split back into stem and hash by pattern alone.
const assetFor = relPath => {
  const source = path.join(generatedRoot, relPath);
  if (!fs.existsSync(source)) return undefined;
  // In dev there is no bundle and nothing is hashed: vite serves any file
  // under the project root at its own path, so the source is also the URL.
  if (DEV) return `/generated_photos/${relPath}`;
  const size = fs.statSync(source).size;
  const ext = path.extname(relPath);
  const stem = path.basename(relPath, ext);
  const match = assetFiles.find(
    file => file.startsWith(`${stem}-`) && file.endsWith(ext) && assetSizes.get(file) === size
  );
  // Assets below vite's assetsInlineLimit are emitted as data URIs inside the
  // JS bundle and have no file to point at — that is expected for the odd tiny
  // avif thumbnail, and the caller falls back to the next format. Anything
  // above the limit going missing is a real problem worth shouting about.
  if (!match && size >= 4096) {
    console.warn(`WARNING: no hashed asset in dist/assets for ${relPath}`);
  }
  return match && `/assets/${match}`;
};

const thumbUrl = (photo, ext) => assetFor(`thumbnails/${photo.filename}${ext}`);
const slideUrl = (photo, width) => assetFor(`slides/${photo.filename}-${width}.jpg`);
const fullSizeUrl = photo => assetFor(`fullsize/${photo.filename}.jpg`);

// The Open Graph / Google Images copy is published under a descriptive name
// rather than the camera's "IMG_6229.jpg": the filename is one of the (weak)
// signals Google Images reads for subject matter, and this site's whole SEO
// surface is image search. The id's hash suffix keeps same-titled photos apart
// — the gallery has five "Airone Cenerino".
const socialName = photo => `${photoId(photo).toLowerCase()}.jpg`;
const socialUrl = photo => `${SITE}/social/${socialName(photo)}`;
// Same file as a path on this site, for the <img> fallbacks below. In dev
// nothing is copied into the output directory, so it points at the generated
// file vite already serves.
const socialPath = photo =>
  DEV ? `/generated_photos/social/${photo.filename}.jpg` : `/social/${socialName(photo)}`;

// <picture> for a gallery-sized thumbnail, preferring avif then webp — the
// same ladder the app uses, so a visitor arriving from a shared link and then
// opening the gallery hits the cache
const thumbPicture = photo => {
  const avif = thumbUrl(photo, ".avif");
  const webp = thumbUrl(photo, ".webp");
  const jpg = thumbUrl(photo, ".jpg") ?? socialPath(photo);
  return `<picture>${avif ? `<source srcset="${avif}" type="image/avif">` : ""}${
    webp ? `<source srcset="${webp}" type="image/webp">` : ""
  }<img src="${jpg}" alt="${escapeHtml(altOf(photo))}" loading="lazy" decoding="async"></picture>`;
};

/* ---------- page shell ---------- */

// Kept deliberately small and inline: these pages exist to paint without
// waiting on the JS bundle, so an extra stylesheet request would defeat the
// point. Values mirror the design tokens in src/index.css.
const PAGE_CSS = `
@font-face{font-family:"Cormorant Garamond";font-style:normal;font-weight:400 600;font-display:swap;src:url("/fonts/cormorant-garamond-latin.woff2") format("woff2")}
@font-face{font-family:"Inter";font-style:normal;font-weight:400 500;font-display:swap;src:url("/fonts/inter-latin.woff2") format("woff2")}
:root{--bg-rgb:11 12 11;--surface-rgb:19 21 19;--text-rgb:236 233 226;--muted-rgb:168 164 154;--accent-rgb:201 168 106;--bg:rgb(var(--bg-rgb));--surface:rgb(var(--surface-rgb));--text:rgb(var(--text-rgb));--muted:rgb(var(--muted-rgb));--accent:rgb(var(--accent-rgb));--serif:"Cormorant Garamond",Georgia,serif;--sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color-scheme:dark}
/* Same palette and the same two-selector dance as src/index.css — see the
   comment there for why the light values cannot be stated only once */
:root[data-theme="light"]{--bg-rgb:246 244 239;--surface-rgb:234 230 221;--text-rgb:26 28 25;--muted-rgb:106 102 94;--accent-rgb:122 92 34;color-scheme:light}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg-rgb:246 244 239;--surface-rgb:234 230 221;--text-rgb:26 28 25;--muted-rgb:106 102 94;--accent-rgb:122 92 34;color-scheme:light}}
*{box-sizing:border-box}
/* Same as src/index.css: the default mobile tap flash is blue and belongs to
   no theme here. It is inherited, so one declaration covers every link and
   button on the page — except the round toggle, whose flash would be painted
   as a square regardless of its radius, so it opts out and gets the tint back
   as an :active background instead. */
html{-webkit-tap-highlight-color:rgb(var(--accent-rgb) / .15)}
.theme-toggle{-webkit-tap-highlight-color:transparent}
.theme-toggle:active{background:rgb(var(--accent-rgb) / .15)}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 64px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:34px}
.brand{font-family:var(--serif);font-size:22px;letter-spacing:.02em;text-decoration:none}
.top nav{display:flex;align-items:center;gap:20px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.top nav a{text-decoration:none}
.top nav a:hover{color:var(--accent)}
.overline{font-size:12px;font-weight:500;letter-spacing:.35em;text-transform:uppercase;color:var(--accent);margin:0 0 12px}
h1{font-family:var(--serif);font-weight:500;font-size:clamp(30px,4.5vw,46px);line-height:1.15;margin:0 0 10px}
.latin{font-style:italic;color:var(--muted);margin:0 0 22px}
.latin a{font-style:normal;color:var(--text)}
/* Capped by viewport height, not just container width: a 2:3 portrait at the
   full 1036px column is over 1500px tall, so on a big screen it ran well past
   the fold. Landscape shots are unaffected — they hit max-width first. */
/* The frame gets its exact shape from an inline aspect-ratio and a max-width
   capping it to 78vh tall, both computed at build time from the photo's pixel
   dimensions. That has to come from CSS rather than the img's own intrinsic
   size: the full-resolution file is megabytes, and until it arrives the img
   has nothing to size itself from, so the box would collapse and the page
   would jump. ::before holds the 24px base64 placeholder from metadata.json,
   blown up and blurred — no JS, the real photo just paints over it. */
.photo{position:relative;background:var(--surface);border-radius:8px;overflow:hidden;margin:0 auto 26px;width:100%}
.photo::before{content:"";position:absolute;inset:0;background-image:var(--blur);background-size:cover;background-position:center;filter:blur(18px);transform:scale(1.08)}
.photo img{position:relative;display:block;width:100%;height:100%;object-fit:cover}
.lede{font-size:18px;max-width:62ch;margin:0 0 28px;color:var(--text)}
.cta{display:inline-block;border:1px solid var(--accent);color:var(--accent);text-decoration:none;padding:11px 22px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;border-radius:2px}
.cta:hover{background:var(--accent);color:var(--bg)}
/* Shooting data on the left, the place card on the right; they stack once the
   pair no longer fits, and either half may be missing (a photo with no EXIF,
   or none with no position) without leaving a stray rule or gap */
.details{display:flex;flex-wrap:wrap;align-items:flex-start;gap:24px 32px;border-top:1px solid rgb(var(--text-rgb) / .12);margin-top:34px;padding-top:22px}
.facts{flex:1 1 340px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:16px 24px;margin:0}
.facts dt{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.facts dd{margin:2px 0 0;font-size:15px}
.place{flex:none;display:flex;align-items:center;gap:18px;margin:0;padding:14px 22px 14px 18px;background:var(--surface);border-radius:8px}
.place figcaption{min-width:0}
.place-label{display:block;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.place b{display:block;font-family:var(--serif);font-weight:500;font-size:24px;line-height:1.2;margin-top:2px}
.place .place-country{display:block;font-size:13px;color:var(--muted);line-height:1.4}
.place-pin{flex:none;color:var(--accent)}
/* The country is one path holding all twenty outlines, so the region drawn
   over it lines up exactly — same projection, same coordinates */
.place-map{flex:none}
.place-italy{fill:none;stroke:rgb(var(--text-rgb) / .3);stroke-width:.45;stroke-linejoin:round}
.place-region{fill:rgb(var(--accent-rgb) / .85);stroke:var(--accent);stroke-width:.9;stroke-linejoin:round}
.pager{display:flex;justify-content:space-between;gap:18px;margin-top:44px;border-top:1px solid rgb(var(--text-rgb) / .12);padding-top:22px}
.pager a{display:flex;gap:12px;align-items:center;text-decoration:none;max-width:48%;color:var(--muted)}
.pager a:hover{color:var(--text)}
.pager img{width:64px;height:44px;object-fit:cover;border-radius:3px}
.pager picture{flex:none}
.pager span{font-size:13px;line-height:1.4}
.pager b{font-weight:500;font-size:15px}
.pager .next{flex-direction:row-reverse;text-align:right;margin-left:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin:0;padding:0;list-style:none}
.grid a{text-decoration:none;display:block}
.grid figure{margin:0}
.grid img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:3px}
.grid figcaption{font-size:14px;color:var(--text);margin-top:8px;line-height:1.4}
.grid figcaption span{display:block;font-size:13px;color:var(--muted);margin-top:3px}
.species-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.species-list a{display:flex;justify-content:space-between;gap:12px;align-items:baseline;text-decoration:none;padding:14px 16px;background:var(--surface);border-radius:3px}
.species-list a:hover{outline:1px solid var(--accent)}
.species-list em{font-style:italic;color:var(--muted);font-size:13px;display:block}
.species-list b{font-weight:500}
.species-list .count{color:var(--accent);font-size:13px;flex:none}
footer{border-top:1px solid rgb(var(--text-rgb) / .12);margin-top:56px;padding-top:22px;color:var(--muted);font-size:13px}
footer a{color:var(--muted)}
/* Which glyph shows is pure CSS, so the icon is right on the very first paint
   — only the label needs the script below */
.theme-toggle{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex:none;padding:0;border:1px solid rgb(var(--text-rgb) / .22);border-radius:50%;background:none;color:var(--text);cursor:pointer;opacity:.85;transition:opacity .2s ease,color .2s ease,border-color .2s ease}
.theme-toggle:hover{opacity:1;color:var(--accent);border-color:var(--accent)}
.theme-toggle .moon{display:none}
:root[data-theme="light"] .theme-toggle .moon{display:block}
:root[data-theme="light"] .theme-toggle .sun{display:none}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]) .theme-toggle .moon{display:block}:root:not([data-theme="dark"]) .theme-toggle .sun{display:none}}
/* The nav wraps under the brand on narrow screens, and the flex gap doubles as
   the row gap — 16px left the links sitting on top of the name */
@media(max-width:600px){.pager picture{display:none}.pager a{max-width:46%}.top{gap:22px 16px}}
`.trim();

const SUN_ICON = `<svg class="sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>`;
const MOON_ICON = `<svg class="moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>`;

const THEME_TOGGLE = `<button class="theme-toggle" type="button" aria-label="Cambia tema">${SUN_ICON}${MOON_ICON}</button>`;

// The photo pages leave the toggle out: they are the landing page for a shared
// link, and the photo is the only thing that should be competing for attention
// there. THEME_SCRIPT is a no-op without the button, and the theme itself still
// follows the stored preference (or the device) via THEME_BOOT.
const nav = ({ themeToggle = true } = {}) =>
  `<nav><a href="/">Galleria</a><a href="/s/">Specie</a><a href="/#/numeri">Numeri</a>${themeToggle ? THEME_TOGGLE : ""}</nav>`;

// Mirrors src/theme.mjs, inlined because these pages load no bundle. The first
// half runs before the stylesheet so an overridden theme never flashes; the
// listener is wired up at the end of the body.
const THEME_BOOT = `<script>
(function(){
  var d=document.documentElement;
  try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}
  var light=d.getAttribute("data-theme")==="light"||(!d.hasAttribute("data-theme")&&matchMedia("(prefers-color-scheme:light)").matches);
  d.style.background=light?"#f6f4ef":"#0b0c0b";
  var m=document.querySelector('meta[name="theme-color"]');
  if(m&&light)m.setAttribute("content","#f6f4ef");
})();
</script>`;

const THEME_SCRIPT = `<script>
(function(){
  var d=document.documentElement,b=document.querySelector(".theme-toggle");
  if(!b)return;
  var sys=function(){return matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"};
  var now=function(){return d.getAttribute("data-theme")||sys()};
  var label=function(){b.setAttribute("aria-label",now()==="dark"?"Passa al tema chiaro":"Passa al tema scuro");b.title=b.getAttribute("aria-label")};
  b.addEventListener("click",function(){
    var next=now()==="dark"?"light":"dark";
    try{next===sys()?localStorage.removeItem("theme"):localStorage.setItem("theme",next)}catch(e){}
    next===sys()?d.removeAttribute("data-theme"):d.setAttribute("data-theme",next);
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute("content",next==="light"?"#f6f4ef":"#0b0c0b");
    d.style.background=next==="light"?"#f6f4ef":"#0b0c0b";
    label();
  });
  matchMedia("(prefers-color-scheme:light)").addEventListener("change",label);
  label();
})();
</script>`;

// Left out in dev: local page views are not real ones
const ANALYTICS = DEV
  ? ""
  : `<script defer src="https://cloud.umami.is/script.js" data-website-id="3d4db7b2-32dd-4afa-82dc-3eb0efbe84d0"></script>`;

const FOOTER = `<footer>
        <p>© ${new Date().getFullYear()} Daniele Bartorilla. Tutti i diritti sul sito, relativi contenuti e foto sono riservati.</p>
        <p><a href="/">Galleria</a> · <a href="/s/">Specie</a> · <a href="/#/privacy">Privacy Policy</a> · <a href="/#/cookie">Cookie Policy</a></p>
      </footer>`;

const layout = ({
  title,
  description,
  canonical,
  head = "",
  body,
  themeToggle = true,
}) => `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#0b0c0b" />
    ${THEME_BOOT}
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/cormorant-garamond-latin.woff2" />
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/inter-latin.woff2" />
    <meta property="og:locale" content="it_IT" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
${head}    <style>${PAGE_CSS}</style>
    ${ANALYTICS}
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <a class="brand" href="/">Daniele Bartorilla</a>
        ${nav({ themeToggle })}
      </div>
${body}
${FOOTER}
    </div>
    ${THEME_SCRIPT}
  </body>
</html>
`;

/* ---------- per-photo pages ---------- */

// Page titles have to differ per page: the gallery holds five photos called
// "Airone Cenerino", and five identical <title>s read as duplicates.
//
// Each photo proposes a series of increasingly specific titles, and a group of
// photos that collide is pushed to the next level together until it breaks up.
// Photos whose plain title is already unique never leave level 0, so the
// common case stays clean and only the genuine clashes get qualified. The last
// level numbers the group ("2 di 2") and is unique by construction, which
// matters for burst frames: two shots of the same bird in the same minute tie
// on every other level.
function buildPageTitles() {
  const SUFFIX = "Daniele Bartorilla";

  const levels = [
    photo => photo.title,
    photo => {
      const date = meta(photo).dateTaken;
      return date && `${photo.title}, ${formatDate(date)}`;
    },
    photo => {
      const date = meta(photo).dateTaken;
      if (!date) return null;
      const at = new Date(date);
      const time = `${at.getUTCHours()}:${String(at.getUTCMinutes()).padStart(2, "0")}`;
      return `${photo.title}, ${formatDate(date)} alle ${time}`;
    },
    (photo, position, total) => `${photo.title} (${position} di ${total})`,
  ];

  const titles = new Map();

  const resolve = (group, level) => {
    if (group.length === 1 || level >= levels.length) {
      group.forEach((photo, index) =>
        titles.set(
          photo.filename,
          `${levels[Math.min(level, levels.length - 1)](photo, index + 1, group.length)} — ${SUFFIX}`
        )
      );
      return;
    }
    const buckets = new Map();
    for (const photo of group) {
      // A level that cannot qualify this photo (no shooting date) keeps the
      // previous label, so it simply stays put and the next level is tried
      const key = levels[level](photo) ?? levels[level - 1]?.(photo) ?? photo.title;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(photo);
    }
    for (const [key, bucket] of buckets) {
      if (bucket.length === 1) {
        titles.set(bucket[0].filename, `${key} — ${SUFFIX}`);
      } else {
        resolve(bucket, level + 1);
      }
    }
  };

  resolve(manifest, 0);

  const seen = new Set();
  for (const value of titles.values()) {
    if (seen.has(value)) console.warn(`WARNING: duplicate page title "${value}"`);
    seen.add(value);
  }
  return titles;
}

const pageTitles = buildPageTitles();

// Only for a build: in dev the pages point straight at generated_photos/
if (!DEV) {
  const socialOutDir = path.join(outDir, "social");
  fs.mkdirSync(socialOutDir, { recursive: true });
  for (const photo of manifest) {
    fs.copyFileSync(
      path.join(socialInputDir, `${photo.filename}.jpg`),
      path.join(socialOutDir, socialName(photo))
    );
  }
}

for (const [index, photo] of manifest.entries()) {
  const m = meta(photo);
  const id = idOf(photo);
  const pageUrl = `${SITE}/p/${id}/`;
  const title = pageTitles.get(photo.filename);
  const description = descriptionOf(photo);
  // Manifest order is shooting date, most recent first
  const prev = manifest[index - 1];
  const next = manifest[index + 1];

  const imageSize = m.width
    ? `    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="${Math.round((1200 * m.height) / m.width)}" />
`
    : "";

  // This page is where the lightbox's HQ button lands, so it shows the photo
  // at full resolution rather than a screen-sized rendition. The smaller
  // slides stay in the srcSet as the low end — a phone has no use for a 24MP
  // file — with `sizes` claiming the full viewport width so a wide screen
  // picks the full-size one. The multi-MB download is the point of the page,
  // and it is progressive JPEG, so it paints in passes over the blurred
  // placeholder instead of appearing all at once.
  const wide = slideUrl(photo, 2048);
  const narrow = slideUrl(photo, 1280);
  const full = fullSizeUrl(photo);
  const srcset = [
    narrow && `${narrow} 1280w`,
    wide && `${wide} 2048w`,
    full && m.width && `${full} ${m.width}w`,
  ]
    .filter(Boolean)
    .join(", ");

  // ImageObject makes the photo eligible for creator / credit info in Google
  // Images results; the BreadcrumbList alongside it turns the URL line of the
  // search result into "danibart.it › Specie › Airone cenerino".
  const primarySpecies = speciesOf(photo)[0];
  // Only the region is stated as structured data, never a precise spot: these
  // are wild birds, and a nesting site is not something to publish coordinates
  // for (it is also why generate-photos.js re-encodes every rendition to strip
  // the GPS tags out of the EXIF).
  const region = findRegion(photo.position);
  const photoLd = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ImageObject",
        contentUrl: socialUrl(photo),
        url: pageUrl,
        name: photo.title,
        description,
        inLanguage: "it",
        ...(m.dateTaken ? { dateCreated: m.dateTaken } : {}),
        ...(m.width ? { width: m.width, height: m.height } : {}),
        ...(region
          ? {
              contentLocation: {
                "@type": "Place",
                name: region,
                address: {
                  "@type": "PostalAddress",
                  addressRegion: region,
                  addressCountry: "IT",
                },
              },
            }
          : {}),
        creator: AUTHOR,
        creditText: "Daniele Bartorilla",
        copyrightNotice: "© Daniele Bartorilla",
        isPartOf: { "@id": `${SITE}/#gallery` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Galleria", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Specie", item: `${SITE}/s/` },
          ...(primarySpecies
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: commonName(primarySpecies),
                  item: `${SITE}/s/${speciesSlug(primarySpecies)}/`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: primarySpecies ? 4 : 3,
            name: photo.title,
            item: pageUrl,
          },
        ],
      },
    ],
  });

  const facts = exifRows(photo)
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("\n            ");

  const place = placeCard(photo);

  const speciesLinks = speciesOf(photo)
    .map(
      latin =>
        `<a href="/s/${speciesSlug(latin)}/">${escapeHtml(commonName(latin))}</a> · ${escapeHtml(latin)}`
    )
    .join(" · ");

  const pagerLink = (target, cls, label) =>
    target
      ? `<a class="${cls}" href="/p/${idOf(target)}/" rel="${cls}">${thumbPicture(
          target
        )}<span>${label}<br><b>${escapeHtml(target.title)}</b></span></a>`
      : "";

  const body = `      <article>
        <p class="overline">Scatto</p>
        <h1>${escapeHtml(photo.title)}</h1>
        ${speciesLinks ? `<p class="latin">${speciesLinks}</p>` : ""}
        <div class="photo" style="${
          m.blur ? `--blur:url('${m.blur}');` : ""
        }${
          m.width
            ? `aspect-ratio:${m.width}/${m.height};max-width:calc(78vh * ${(
                m.width / m.height
              ).toFixed(4)})`
            : ""
        }">
          <img src="${full ?? wide ?? socialPath(photo)}"${
            srcset ? ` srcset="${srcset}"` : ""
          } sizes="100vw" alt="${escapeHtml(altOf(photo))}"${
            m.width ? ` width="${m.width}" height="${m.height}"` : ""
          } fetchpriority="high" decoding="async" />
        </div>
        ${photo.description ? `<p class="lede">${escapeHtml(photo.description)}</p>` : ""}
        <a class="cta" href="/#/?photo=${id}">Apri nella galleria</a>
        ${
          facts || place
            ? `<div class="details">
          ${facts ? `<dl class="facts">\n            ${facts}\n          </dl>` : ""}
          ${place}
        </div>`
            : ""
        }
      </article>
      <div class="pager">
        ${pagerLink(prev, "prev", "Foto precedente")}
        ${pagerLink(next, "next", "Foto successiva")}
      </div>`;

  const head = `    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(socialUrl(photo))}" />
${imageSize}    <meta property="og:image:alt" content="${escapeHtml(altOf(photo))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${photoLd}</script>
`;

  const pageDir = path.join(outDir, "p", id);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(
    path.join(pageDir, "index.html"),
    layout({
      title,
      description,
      canonical: pageUrl,
      head,
      body,
      themeToggle: false,
    })
  );
}
console.log(`Photo pages created: ${manifest.length}`);

/* ---------- per-species pages ---------- */

const speciesList = collectSpecies(manifest).map(latin => ({
  latin,
  name: commonName(latin),
  slug: speciesSlug(latin),
  photos: manifest.filter(photo => speciesOf(photo).includes(latin)),
}));

// A slug collision would silently overwrite one species' page with another's
const seenSlugs = new Map();
for (const { slug, latin } of speciesList) {
  if (seenSlugs.has(slug)) {
    console.error(
      `ERROR: species slug "${slug}" is shared by "${seenSlugs.get(slug)}" and "${latin}"`
    );
    process.exit(1);
  }
  seenSlugs.set(slug, latin);
}

for (const { latin, name, slug, photos } of speciesList) {
  const pageUrl = `${SITE}/s/${slug}/`;
  const title = `${name} (${latin}) — foto di Daniele Bartorilla`;
  const count = photos.length === 1 ? "1 fotografia" : `${photos.length} fotografie`;
  const description = `${count} di ${name.toLowerCase()} (${latin}) nella galleria di fotografia naturalistica di Daniele Bartorilla.`;

  const collectionLd = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${name} (${latin})`,
        description,
        url: pageUrl,
        inLanguage: "it",
        isPartOf: { "@id": `${SITE}/#gallery` },
        about: { "@type": "Taxon", name: latin, alternateName: name },
        hasPart: photos.map(photo => ({
          "@type": "ImageObject",
          contentUrl: socialUrl(photo),
          url: `${SITE}/p/${idOf(photo)}/`,
          name: photo.title,
          creator: { "@id": AUTHOR["@id"] },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Galleria", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Specie", item: `${SITE}/s/` },
          { "@type": "ListItem", position: 3, name, item: pageUrl },
        ],
      },
    ],
  });

  // The caption carries the photo's description, not just its title: it is
  // unique prose that already exists, and without it a species page is a grid
  // of near-identical headings with nothing for a crawler to read.
  const items = photos
    .map(
      photo =>
        `        <li><a href="/p/${idOf(photo)}/"><figure>${thumbPicture(photo)}<figcaption>${escapeHtml(
          photo.title
        )}${
          photo.description ? `<span>${escapeHtml(photo.description)}</span>` : ""
        }</figcaption></figure></a></li>`
    )
    .join("\n");

  const body = `      <p class="overline">Specie</p>
      <h1>${escapeHtml(name)}</h1>
      <p class="latin">${escapeHtml(latin)} · ${count}</p>
      <ul class="grid">
${items}
      </ul>
      <p style="margin-top:36px"><a class="cta" href="/s/">Tutte le specie</a></p>`;

  const head = `    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(socialUrl(photos[0]))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${collectionLd}</script>
`;

  const pageDir = path.join(outDir, "s", slug);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(
    path.join(pageDir, "index.html"),
    layout({ title, description, canonical: pageUrl, head, body })
  );
}

// Species index at /s/ — the hub the static nav points at, and the one page
// linking to every species page
const speciesIndexBody = `      <p class="overline">Indice</p>
      <h1>Specie fotografate</h1>
      <p class="lede">${speciesList.length} specie, ${manifest.length} scatti.</p>
      <ul class="species-list">
${speciesList
  .map(
    ({ name, latin, slug, photos }) =>
      `        <li><a href="/s/${slug}/"><span><b>${escapeHtml(name)}</b><em>${escapeHtml(
        latin
      )}</em></span><span class="count">${photos.length}</span></a></li>`
  )
  .join("\n")}
      </ul>`;

fs.mkdirSync(path.join(outDir, "s"), { recursive: true });
fs.writeFileSync(
  path.join(outDir, "s", "index.html"),
  layout({
    title: `Specie fotografate — ${SITE_NAME}`,
    description: `Le ${speciesList.length} specie di uccelli presenti nella galleria di Daniele Bartorilla, con tutte le foto di ciascuna.`,
    canonical: `${SITE}/s/`,
    head: `    <meta property="og:type" content="website" />
    <meta property="og:title" content="Specie fotografate — ${escapeHtml(SITE_NAME)}" />
    <meta property="og:url" content="${SITE}/s/" />
`,
    body: speciesIndexBody,
  })
);
console.log(`Species pages created: ${speciesList.length} (+ index)`);

// Everything below belongs to a build and to nothing else: the dev server has
// no dist/index.html to inject tags into (it serves the root index.html
// through vite) and no crawler to hand a sitemap to. Bailing out here rather
// than wrapping the rest keeps the templates below at their current
// indentation — the whitespace inside them is output.
if (DEV) process.exit(0);

/* ---------- site-wide tags on the SPA entry page ---------- */

// With split heroSmall/heroLarge heroes, the large one represents the site
// (Open Graph previews are landscape-shaped, like wide viewports).
const heroFallback = manifest.find(photo => photo.hero) ?? manifest[0];
const heroLarge = manifest.find(photo => photo.heroLarge) ?? heroFallback;
const heroSmall = manifest.find(photo => photo.heroSmall) ?? heroFallback;
const hero = heroLarge;
const indexPath = path.join(distDir, "index.html");

// Site-wide structured data: the author and the gallery itself. Every photo is
// listed as associatedMedia pointing at its own /p/ page, which now carries
// the full ImageObject.
const siteLd = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    {
      ...AUTHOR,
      jobTitle: "Fotografo naturalista",
      email: `mailto:${EMAIL}`,
    },
    {
      "@type": ["WebSite", "ImageGallery"],
      "@id": `${SITE}/#gallery`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: `${SITE}/`,
      inLanguage: "it",
      author: { "@id": AUTHOR["@id"] },
      associatedMedia: manifest.map(photo => ({
        "@type": "ImageObject",
        contentUrl: socialUrl(photo),
        url: `${SITE}/p/${idOf(photo)}/`,
        name: photo.title,
        ...(photo.description || photo.species
          ? { description: photo.description || photo.species }
          : {}),
        creator: { "@id": AUTHOR["@id"] },
        creditText: "Daniele Bartorilla",
        copyrightNotice: "© Daniele Bartorilla",
      })),
    },
  ],
});

const heroMeta = meta(hero);
const heroImageSize = heroMeta.width
  ? `    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="${Math.round((1200 * heroMeta.height) / heroMeta.width)}" />
`
  : "";
const siteTags = `    <meta property="og:type" content="website" />
    <meta property="og:locale" content="it_IT" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:description" content="${escapeHtml(SITE_DESCRIPTION)}" />
    <meta property="og:url" content="${SITE}/" />
    <meta property="og:image" content="${socialUrl(hero)}" />
${heroImageSize}    <meta property="og:image:alt" content="${escapeHtml(altOf(hero))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${siteLd}</script>
`;
const indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("</head>")) {
  console.error("ERROR: dist/index.html has no </head> to inject Open Graph tags into");
  process.exit(1);
}

// Preload the hero background (the LCP): without it the browser discovers the
// image only after downloading and running the JS bundle. AVIF is preloaded
// rather than webp because the hero <picture> in Gallery.jsx lists AVIF first;
// type="image/avif" makes browsers without AVIF support skip the preload and
// fall through to the webp <source>, so no viewport downloads two heroes.
// With distinct small/large heroes, each preload also carries the media query
// of the viewport it serves — mirroring HERO_LARGE_QUERY in Gallery.jsx.
const heroVariants =
  heroSmall.filename === heroLarge.filename
    ? [{ photo: heroLarge }]
    : [
        { photo: heroSmall, media: "(max-width: 1023.98px)" },
        { photo: heroLarge, media: "(min-width: 1024px)" },
      ];

let preloadTag = "";
for (const { photo, media } of heroVariants) {
  const avif = assetFor(`hero/${photo.filename}.avif`);
  const webp = assetFor(`hero/${photo.filename}.webp`);
  const asset = avif ?? webp;
  if (!asset) {
    console.warn(`WARNING: no hero avif/webp asset found for ${photo.filename}, skipping preload`);
    continue;
  }
  const mediaAttr = media ? ` media="${media}"` : "";
  preloadTag += `    <link rel="preload" as="image" type="image/${
    avif ? "avif" : "webp"
  }" fetchpriority="high"${mediaAttr} href="${asset}" />
`;
}

fs.writeFileSync(indexPath, indexHtml.replace("</head>", `${preloadTag}${siteTags}  </head>`));
console.log("Open Graph tags injected into dist/index.html");

/* ---------- sitemap ---------- */

// Every static page gets its own <url> now that the /p/ pages are real content
// rather than redirects (a redirect is not indexable, so they used to be
// listed only as images of the homepage).
const newestDate = photos =>
  photos
    .map(photo => meta(photo).dateTaken)
    .filter(Boolean)
    .sort()
    .pop();

const urlEntry = (loc, { lastmod, images = [], priority } = {}) =>
  [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod && `    <lastmod>${lastmod.slice(0, 10)}</lastmod>`,
    priority && `    <priority>${priority}</priority>`,
    ...images.map(image => `    <image:image><image:loc>${image}</image:loc></image:image>`),
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[
  urlEntry(`${SITE}/`, {
    lastmod: newestDate(manifest),
    priority: "1.0",
    images: manifest.map(socialUrl),
  }),
  urlEntry(`${SITE}/s/`, { lastmod: newestDate(manifest), priority: "0.6" }),
  ...speciesList.map(({ slug, photos }) =>
    urlEntry(`${SITE}/s/${slug}/`, {
      lastmod: newestDate(photos),
      priority: "0.7",
      images: photos.map(socialUrl),
    })
  ),
  ...manifest.map(photo =>
    urlEntry(`${SITE}/p/${idOf(photo)}/`, {
      lastmod: meta(photo).dateTaken,
      priority: "0.8",
      images: [socialUrl(photo)],
    })
  ),
].join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);
console.log(`Sitemap written: ${manifest.length} photo pages, ${speciesList.length} species pages`);
