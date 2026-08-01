const sharp = require("sharp");
const exifReader = require("exif-reader");
const fs = require("fs");
const path = require("path");

// The two shared ESM modules the rest of the site reads the manifest through.
// Required rather than imported because this script is CommonJS (sharp and
// exif-reader are its only other dependencies, and it predates the .mjs half);
// node has supported require() of an ESM module without top-level await since
// 22.12, and neither of these has one.
const { resolveHeroes } = require("./hero.mjs");
const { auditSpecies, canonicalSpecies, missingSpeciesMessage } = require("./species.mjs");

const manifestPath = path.join(__dirname, "..", "photos.json");
let manifest = require(manifestPath);

const inputDir = path.join(process.cwd(), "photos");
const outputRoot = path.join(process.cwd(), "generated_photos");
const thumbnailsOutputDir = path.join(outputRoot, "thumbnails");
const fullSizeOutputDir = path.join(outputRoot, "fullsize");
const slidesOutputDir = path.join(outputRoot, "slides");
const originalOutputDir = path.join(outputRoot, "original");
const heroOutputDir = path.join(outputRoot, "hero");
const socialOutputDir = path.join(outputRoot, "social");
const metadataPath = path.join(outputRoot, "metadata.json");

const files = fs.readdirSync(inputDir).filter(file => file.endsWith(".jpg"));

const names = files.map(file => path.basename(file, ".jpg"));
const listed = manifest.map(photo => photo.filename);
const missingFromManifest = names.filter(name => !listed.includes(name));
const missingFromDir = listed.filter(name => !names.includes(name));

if (missingFromManifest.length > 0) {
  for (const name of missingFromManifest) {
    console.error(`ERROR: photos/${name}.jpg has no entry in photos.json`);
  }
  process.exit(1);
}

// Entries whose source photo was deleted are pruned from photos.json, so
// removing a photo only takes deleting the .jpg
if (missingFromDir.length > 0) {
  manifest = manifest.filter(photo => names.includes(photo.filename));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  for (const name of missingFromDir) {
    console.log(`Removed "${name}" from photos.json: photos/${name}.jpg no longer exists`);
  }
}

// A multi-species entry is canonically written "Egretta garzetta ·
// Threskiornis aethiopicus", and "·" is on nobody's keyboard: a list typed
// with commas or semicolons is rewritten into that form here, so the manifest
// ends up holding one spelling and nothing downstream has to guess. Same idea
// as the reordering at the bottom of this file — photos.json is as much
// generated as it is written by hand.
const renamed = manifest.filter(
  photo => photo.species && canonicalSpecies(photo.species) !== photo.species
);
if (renamed.length > 0) {
  for (const photo of renamed) photo.species = canonicalSpecies(photo.species);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  for (const photo of renamed) {
    console.log(`Normalized the species of "${photo.filename}": ${photo.species}`);
  }
}

// A species src/species.mjs has no name for stops the run here, before any
// rendition or page exists — see auditSpecies for why it is not a warning.
// This is the earliest either dev or build can catch it: both start with this
// script, and the message says exactly what to paste.
const missingNames = auditSpecies(manifest);
if (missingNames.length > 0) {
  for (const entry of missingNames) console.error(missingSpeciesMessage(entry));
  process.exit(1);
}

// Downscaled lightbox renditions: srcSet entries so phones fetch ~1280px
// (a few hundred KB) instead of the multi-MB full-resolution photo
const SLIDE_WIDTHS = [1280, 2048];

fs.mkdirSync(thumbnailsOutputDir, { recursive: true });
fs.mkdirSync(fullSizeOutputDir, { recursive: true });
fs.mkdirSync(slidesOutputDir, { recursive: true });
fs.mkdirSync(originalOutputDir, { recursive: true });
fs.mkdirSync(heroOutputDir, { recursive: true });
fs.mkdirSync(socialOutputDir, { recursive: true });

// Remove outputs whose source photo is gone, or Vite would still bundle them.
// Outputs are matched by basename since thumbnails/hero also have .webp/.avif variants.
const stem = file => file.replace(/\.(jpg|webp|avif)$/, "");
for (const dir of [thumbnailsOutputDir, fullSizeOutputDir, originalOutputDir, socialOutputDir]) {
  for (const file of fs.readdirSync(dir)) {
    if (!names.includes(stem(file))) {
      fs.unlinkSync(path.join(dir, file));
      console.log(`Removed stale output: ${file}`);
    }
  }
}

// Slide renditions carry a width suffix (<name>-1280.jpg)
for (const file of fs.readdirSync(slidesOutputDir)) {
  if (!names.includes(stem(file).replace(/-\d+$/, ""))) {
    fs.unlinkSync(path.join(slidesOutputDir, file));
    console.log(`Removed stale output: ${file}`);
  }
}

// The hero background gets its own screen-sized derivative. Which photos need
// one is asked of src/hero.mjs — the same resolution the gallery and the
// preload tags use — rather than read off the flags: a manifest naming only
// heroLarge leaves the narrow viewport on the first entry, a different photo
// each time a newer one is added, and that one needs its rendition just as
// much. Stale files therefore include both photos that lost a flag and photos
// that stopped being the fallback.
const heroes = resolveHeroes(manifest);
const heroNames = [
  ...new Set([heroes.small?.filename, heroes.large?.filename].filter(Boolean)),
];
for (const file of fs.readdirSync(heroOutputDir)) {
  if (!heroNames.includes(stem(file))) {
    fs.unlinkSync(path.join(heroOutputDir, file));
    console.log(`Removed stale hero output: ${file}`);
  }
}

const jobs = [];
const generate = (outputPath, build, label) => {
  if (fs.existsSync(outputPath)) return;
  jobs.push(
    build()
      .toFile(outputPath)
      .then(() => console.log(`${label}: ${path.basename(outputPath)}`))
  );
};

for (const name of heroNames) {
  const inputPath = path.join(inputDir, `${name}.jpg`);
  generate(path.join(heroOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).resize({ width: 1920 }).jpeg({ quality: 78, mozjpeg: true }), "Hero created");
  generate(path.join(heroOutputDir, `${name}.webp`), () =>
    sharp(inputPath).resize({ width: 1920 }).webp({ quality: 70 }), "Hero webp created");
  // AVIF is ~30% smaller than webp at matching quality, and the hero is the
  // LCP. effort 4 keeps a full regeneration in the tens of seconds rather
  // than minutes; browsers without AVIF fall through to the webp <source>
  generate(path.join(heroOutputDir, `${name}.avif`), () =>
    sharp(inputPath).resize({ width: 1920 }).avif({ quality: 45, effort: 4 }), "Hero avif created");
}

for (const name of names) {
  const inputPath = path.join(inputDir, `${name}.jpg`);
  // q90 mozjpeg is visually transparent at screen resolution and 3-8x smaller
  // than q100; mozjpeg also emits progressive scans, so the lightbox renders
  // the photo incrementally while it downloads
  generate(path.join(fullSizeOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).jpeg({ quality: 90, mozjpeg: true }), "Full-size created");
  // withoutEnlargement: photos narrower than the target just get re-encoded
  // at their native size; photos.jsx drops entries that match the full width
  for (const width of SLIDE_WIDTHS) {
    generate(path.join(slidesOutputDir, `${name}-${width}.jpg`), () =>
      sharp(inputPath).resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true }), `Slide ${width} created`);
  }
  // q100 rendition for the lightbox HQ button; re-encoded with sharp (rather
  // than copying the source file) so EXIF/GPS metadata stays stripped
  generate(path.join(originalOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).jpeg({ quality: 100, mozjpeg: true }), "Original created");
  generate(path.join(thumbnailsOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).resize({ width: 600 }).jpeg({ quality: 70, mozjpeg: true }), "Thumbnail created");
  generate(path.join(thumbnailsOutputDir, `${name}.webp`), () =>
    sharp(inputPath).resize({ width: 600 }).webp({ quality: 74 }), "Thumbnail webp created");
  generate(path.join(thumbnailsOutputDir, `${name}.avif`), () =>
    sharp(inputPath).resize({ width: 600 }).avif({ quality: 50, effort: 4 }), "Thumbnail avif created");
  // Social images back the per-photo Open Graph pages (see generate-static-pages.mjs)
  generate(path.join(socialOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).resize({ width: 1200 }).jpeg({ quality: 75, mozjpeg: true }), "Social created");
}

// metadata.json: per photo, the pixel dimensions (to reserve gallery layout
// before thumbnails load), a tiny base64 blur-up placeholder, and the shooting
// data (camera, focal length, aperture, shutter, ISO) parsed from EXIF.
// Incremental like the images: entries of already-known photos are kept as-is.
const firstNumber = value => (Array.isArray(value) ? value[0] : value);

async function extractMetadata(name) {
  const inputPath = path.join(inputDir, `${name}.jpg`);
  const info = await sharp(inputPath).metadata();
  // EXIF orientations 5-8 are rotated 90°: displayed width/height are swapped
  const swapped = (info.orientation ?? 1) >= 5;
  const entry = {
    width: swapped ? info.height : info.width,
    height: swapped ? info.width : info.height,
    dateTaken: null,
  };

  if (info.exif) {
    try {
      const parsed = exifReader(info.exif);
      const photoTags = parsed.Photo ?? {};
      // Used to sort the gallery by shooting date (most recent first); falls
      // back to the file's modify date tag when the shot date is missing
      const dateTaken = photoTags.DateTimeOriginal ?? parsed.Image?.DateTime;
      if (dateTaken instanceof Date && !isNaN(dateTaken)) entry.dateTaken = dateTaken.toISOString();
      // These cameras write Make/Model inside the Photo IFD, where exif-reader
      // only knows them by tag number (271/272)
      const model = parsed.Image?.Model ?? photoTags["272"];
      const exif = {
        camera: model?.replace(/\0/g, "").trim() || undefined,
        lens: photoTags.LensModel?.replace(/\0/g, "").trim() || undefined,
        focalLength: photoTags.FocalLength,
        fNumber: photoTags.FNumber && Math.round(photoTags.FNumber * 10) / 10,
        exposureTime: photoTags.ExposureTime,
        iso: firstNumber(photoTags.ISOSpeedRatings ?? photoTags.PhotographicSensitivity),
      };
      Object.keys(exif).forEach(key => exif[key] === undefined && delete exif[key]);
      if (Object.keys(exif).length > 0) entry.exif = exif;
    } catch (err) {
      console.warn(`WARNING: could not parse EXIF of ${name}.jpg: ${err.message}`);
    }
  }

  const blur = await sharp(inputPath)
    .rotate() // bake in the EXIF orientation, lost in raw pixel output
    .resize({ width: 24 })
    .jpeg({ quality: 50 })
    .toBuffer();
  entry.blur = `data:image/jpeg;base64,${blur.toString("base64")}`;

  console.log(`Metadata extracted: ${name}.jpg`);
  return entry;
}

async function buildMetadata() {
  let previous = {};
  if (fs.existsSync(metadataPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    } catch {
      previous = {};
    }
  }
  const metadata = {};
  for (const name of names) {
    const cached = previous[name];
    // Older cached entries predate the dateTaken field, so re-extract those
    metadata[name] = cached && Object.prototype.hasOwnProperty.call(cached, "dateTaken")
      ? cached
      : await extractMetadata(name);
  }
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));
  return metadata;
}

// Gallery display order tracks shooting date (most recent first); undated
// photos (no EXIF) keep their relative order and sort after dated ones
function sortManifestByDate(metadata) {
  const sorted = [...manifest].sort((a, b) => {
    const dateA = metadata[a.filename]?.dateTaken;
    const dateB = metadata[b.filename]?.dateTaken;
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    return 0;
  });
  if (sorted.some((photo, i) => photo.filename !== manifest[i].filename)) {
    fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
    console.log("Reordered photos.json by shooting date (most recent first)");
  }
}

const metadataPromise = buildMetadata();
Promise.all([...jobs, metadataPromise])
  .then(results => sortManifestByDate(results[results.length - 1]))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
