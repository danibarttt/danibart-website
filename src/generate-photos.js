const sharp = require("sharp");
const exifReader = require("exif-reader");
const fs = require("fs");
const path = require("path");

const manifest = require("../photos.json");

const inputDir = path.join(process.cwd(), "photos");
const outputRoot = path.join(process.cwd(), "generated_photos");
const thumbnailsOutputDir = path.join(outputRoot, "thumbnails");
const fullSizeOutputDir = path.join(outputRoot, "fullsize");
const heroOutputDir = path.join(outputRoot, "hero");
const socialOutputDir = path.join(outputRoot, "social");
const metadataPath = path.join(outputRoot, "metadata.json");

const files = fs.readdirSync(inputDir).filter(file => file.endsWith(".jpg"));

const names = files.map(file => path.basename(file, ".jpg"));
const listed = manifest.map(photo => photo.filename);
const missingFromManifest = names.filter(name => !listed.includes(name));
const missingFromDir = listed.filter(name => !names.includes(name));

if (missingFromManifest.length > 0 || missingFromDir.length > 0) {
  for (const name of missingFromManifest) {
    console.error(`ERROR: photos/${name}.jpg has no entry in photos.json`);
  }
  for (const name of missingFromDir) {
    console.error(`ERROR: photos.json lists "${name}" but photos/${name}.jpg does not exist`);
  }
  process.exit(1);
}

fs.mkdirSync(thumbnailsOutputDir, { recursive: true });
fs.mkdirSync(fullSizeOutputDir, { recursive: true });
fs.mkdirSync(heroOutputDir, { recursive: true });
fs.mkdirSync(socialOutputDir, { recursive: true });

// Remove outputs whose source photo is gone, or Vite would still bundle them.
// Outputs are matched by basename since thumbnails/hero also have .webp variants.
const stem = file => file.replace(/\.(jpg|webp)$/, "");
for (const dir of [thumbnailsOutputDir, fullSizeOutputDir, socialOutputDir]) {
  for (const file of fs.readdirSync(dir)) {
    if (!names.includes(stem(file))) {
      fs.unlinkSync(path.join(dir, file));
      console.log(`Removed stale output: ${file}`);
    }
  }
}

// The hero background gets its own screen-sized derivative; only hero-flagged
// entries need one, so stale files also include photos that lost the flag
const heroNames = manifest.filter(photo => photo.hero).map(photo => photo.filename);
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
}

for (const name of names) {
  const inputPath = path.join(inputDir, `${name}.jpg`);
  generate(path.join(fullSizeOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).jpeg({ quality: 100, mozjpeg: true }), "Full-size created");
  generate(path.join(thumbnailsOutputDir, `${name}.jpg`), () =>
    sharp(inputPath).resize({ width: 600 }).jpeg({ quality: 70, mozjpeg: true }), "Thumbnail created");
  generate(path.join(thumbnailsOutputDir, `${name}.webp`), () =>
    sharp(inputPath).resize({ width: 600 }).webp({ quality: 74 }), "Thumbnail webp created");
  // Social images back the per-photo Open Graph pages (see generate-social-pages.js)
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
  };

  if (info.exif) {
    try {
      const parsed = exifReader(info.exif);
      const photoTags = parsed.Photo ?? {};
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
    metadata[name] = previous[name] ?? await extractMetadata(name);
  }
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));
}

Promise.all([...jobs, buildMetadata()]).catch(err => {
  console.error(err);
  process.exit(1);
});
