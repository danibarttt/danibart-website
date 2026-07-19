// Post-build step (after `vite build`): gives every photo a static
// `dist/p/<id>/index.html` stub carrying Open Graph tags — so links shared
// via the lightbox share button unfurl with the photo on WhatsApp & co. —
// which then redirects into the SPA deep link. Also copies the 1200px
// social renditions to dist/ and injects site-wide Open Graph tags
// (hero image) into dist/index.html.
import fs from "fs";
import path from "path";

import { photoId } from "./photo-id.mjs";

const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "photos.json"), "utf8"));
const metadata = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "generated_photos/metadata.json"), "utf8")
);

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

// Serialize JSON-LD for inline <script> embedding ("<" could otherwise
// close the script tag early)
const jsonLd = data => JSON.stringify(data).replace(/</g, "\\u003c");

const AUTHOR = {
  "@type": "Person",
  "@id": `${SITE}/#person`,
  name: "Daniele Bartorilla",
  url: `${SITE}/`,
};

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

  // ImageObject structured data: makes the photo eligible for creator /
  // credit info in Google Images results
  const photoLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: imageUrl,
    url: pageUrl,
    name: photo.title,
    description,
    inLanguage: "it",
    creator: AUTHOR,
    creditText: "Daniele Bartorilla",
    copyrightNotice: "© Daniele Bartorilla",
  });

  const html = `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="it_IT" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
${imageSize}    <meta property="og:image:alt" content="${escapeHtml(photo.species ? `${photo.title} (${photo.species})` : photo.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${SITE}/" />
    <script type="application/ld+json">${photoLd}</script>
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

// Site-wide Open Graph tags on the SPA entry page, using the hero photo.
// With split heroSmall/heroLarge heroes, the large one represents the site
// (Open Graph previews are landscape-shaped, like wide viewports).
const heroFallback = manifest.find(photo => photo.hero) ?? manifest[0];
const heroLarge = manifest.find(photo => photo.heroLarge) ?? heroFallback;
const heroSmall = manifest.find(photo => photo.heroSmall) ?? heroFallback;
const hero = heroLarge;
const indexPath = path.join(distDir, "index.html");
const SITE_DESCRIPTION =
  "Fotografia naturalistica di Daniele Bartorilla: aironi e altri uccelli delle zone umide.";

// Site-wide structured data: the author and the gallery itself. Every photo
// is listed as associatedMedia — the /p/ pages carrying the per-photo
// ImageObject are redirects, so this is the copy crawlers reliably read.
const siteLd = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    {
      ...AUTHOR,
      jobTitle: "Fotografo naturalista",
      email: "mailto:danielebartorilla@gmail.com",
    },
    {
      "@type": ["WebSite", "ImageGallery"],
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: `${SITE}/`,
      inLanguage: "it",
      author: { "@id": AUTHOR["@id"] },
      associatedMedia: manifest.map(photo => ({
        "@type": "ImageObject",
        contentUrl: `${SITE}/social/${photo.filename}.jpg`,
        url: `${SITE}/p/${photoId(photo)}/`,
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

const heroMeta = metadata[hero.filename] ?? {};
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
    <meta property="og:image" content="${SITE}/social/${hero.filename}.jpg" />
${heroImageSize}    <meta property="og:image:alt" content="${escapeHtml(hero.species ? `${hero.title} (${hero.species})` : hero.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${siteLd}</script>
`;
const indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("</head>")) {
  console.error("ERROR: dist/index.html has no </head> to inject Open Graph tags into");
  process.exit(1);
}

// Preload the hero background (the LCP): without it the browser discovers the
// image only after downloading and running the JS bundle. The hashed asset is
// found by basename; the hero rendition is the largest webp with that stem
// (the other candidate is the 600px thumbnail). With distinct small/large
// heroes, each preload carries the media query of the viewport it serves —
// it must mirror HERO_LARGE_QUERY in Gallery.jsx so only one image downloads.
const assetsDir = path.join(distDir, "assets");
const findHeroAsset = filename =>
  fs
    .readdirSync(assetsDir)
    .filter(file => file.startsWith(`${filename}-`) && file.endsWith(".webp"))
    .map(file => ({ file, size: fs.statSync(path.join(assetsDir, file)).size }))
    .sort((a, b) => b.size - a.size)[0];

const heroVariants =
  heroSmall.filename === heroLarge.filename
    ? [{ photo: heroLarge }]
    : [
        { photo: heroSmall, media: "(max-width: 1023.98px)" },
        { photo: heroLarge, media: "(min-width: 1024px)" },
      ];

let preloadTag = "";
for (const { photo, media } of heroVariants) {
  const asset = findHeroAsset(photo.filename);
  if (!asset) {
    console.warn(`WARNING: no hero webp asset found for ${photo.filename}, skipping preload`);
    continue;
  }
  const mediaAttr = media ? ` media="${media}"` : "";
  preloadTag += `    <link rel="preload" as="image" type="image/webp" fetchpriority="high"${mediaAttr} href="/assets/${asset.file}" />
`;
}

fs.writeFileSync(indexPath, indexHtml.replace("</head>", `${preloadTag}${siteTags}  </head>`));
console.log("Open Graph tags injected into dist/index.html");

// Image sitemap: every photo is listed as an image of the homepage (where the
// gallery actually shows them — the /p/ pages redirect there anyway, so they
// are not listed as standalone URLs). Google's crawler only reads image:loc.
const sitemapEntries = manifest
  .map(photo => `    <image:image><image:loc>${SITE}/social/${photo.filename}.jpg</image:loc></image:image>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}/</loc>
${sitemapEntries}
  </url>
</urlset>
`;
fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);
console.log(`Sitemap written with ${manifest.length} images`);
