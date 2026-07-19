// Post-build step (after `vite build`): gives every photo a static
// `dist/p/<id>/index.html` stub carrying Open Graph tags — so links shared
// via the lightbox share button unfurl with the photo on WhatsApp & co. —
// which then redirects into the SPA deep link. Also copies the 1200px
// social renditions to dist/ and injects site-wide Open Graph tags
// (hero image) into dist/index.html.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const manifest = require("../photos.json");
const metadata = require("../generated_photos/metadata.json");

const SITE = "https://danibart.it";
const SITE_NAME = "Daniele Bartorilla — Fotografia Naturalistica";

const distDir = path.join(process.cwd(), "dist");
const socialInputDir = path.join(process.cwd(), "generated_photos/social");

if (!fs.existsSync(distDir)) {
  console.error("ERROR: dist/ not found — run vite build first");
  process.exit(1);
}

const escapeHtml = text =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Must match the id computed in src/photos.jsx
const photoId = photo =>
  `${photo.title.replace(/ /g, "-")}-${crypto.createHash("md5").update(photo.filename).digest("hex")}`;

fs.cpSync(socialInputDir, path.join(distDir, "social"), { recursive: true });

for (const photo of manifest) {
  const id = photoId(photo);
  const meta = metadata[photo.filename] ?? {};
  const imageUrl = `${SITE}/social/${photo.filename}.jpg`;
  const pageUrl = `${SITE}/p/${id}/`;
  const target = `/#/?photo=${id}`;
  const title = `${photo.title} — Daniele Bartorilla`;
  const description =
    photo.description || photo.species || "Fotografia naturalistica di Daniele Bartorilla";
  const imageSize = meta.width
    ? `    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="${Math.round((1200 * meta.height) / meta.width)}" />
`
    : "";

  const html = `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
${imageSize}    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${SITE}/" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(target)}" />
    <script>location.replace(${JSON.stringify(target)});</script>
  </head>
  <body style="background:#0b0c0b"></body>
</html>
`;

  const pageDir = path.join(distDir, "p", id);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, "index.html"), html);
}
console.log(`Social pages created: ${manifest.length}`);

// Site-wide Open Graph tags on the SPA entry page, using the hero photo
const hero = manifest.find(photo => photo.hero) ?? manifest[0];
const indexPath = path.join(distDir, "index.html");
const siteTags = `    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:description" content="Fotografia naturalistica di Daniele Bartorilla: aironi e altri uccelli delle zone umide." />
    <meta property="og:url" content="${SITE}/" />
    <meta property="og:image" content="${SITE}/social/${hero.filename}.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
`;
const indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("</head>")) {
  console.error("ERROR: dist/index.html has no </head> to inject Open Graph tags into");
  process.exit(1);
}

// Preload the hero background (the LCP): without it the browser discovers the
// image only after downloading and running the JS bundle. The hashed asset is
// found by basename; the hero rendition is the largest webp with that stem
// (the other candidate is the 600px thumbnail).
let preloadTag = "";
const assetsDir = path.join(distDir, "assets");
const heroAsset = fs
  .readdirSync(assetsDir)
  .filter(file => file.startsWith(`${hero.filename}-`) && file.endsWith(".webp"))
  .map(file => ({ file, size: fs.statSync(path.join(assetsDir, file)).size }))
  .sort((a, b) => b.size - a.size)[0];
if (heroAsset) {
  preloadTag = `    <link rel="preload" as="image" type="image/webp" fetchpriority="high" href="/assets/${heroAsset.file}" />
`;
} else {
  console.warn(`WARNING: no hero webp asset found for ${hero.filename}, skipping preload`);
}

fs.writeFileSync(indexPath, indexHtml.replace("</head>", `${preloadTag}${siteTags}  </head>`));
console.log("Open Graph tags injected into dist/index.html");
