const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const manifest = require("../photos.json");

const inputDir = path.join(process.cwd(), "photos");
const thumbnailsOutputDir = path.join(process.cwd(), "generated_photos/thumbnails");
const fullSizeOutputDir = path.join(process.cwd(), "generated_photos/fullsize");

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

// Remove outputs whose source photo is gone, or Vite would still bundle them
for (const dir of [thumbnailsOutputDir, fullSizeOutputDir]) {
  for (const file of fs.readdirSync(dir)) {
    if (!files.includes(file)) {
      fs.unlinkSync(path.join(dir, file));
      console.log(`Removed stale output: ${file}`);
    }
  }
}

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const fullSizeOutputPath = path.join(fullSizeOutputDir, file);
  const thumbnailsOutputPath = path.join(thumbnailsOutputDir, file);

  if (!fs.existsSync(fullSizeOutputPath)) {
    sharp(inputPath)
      .jpeg({ quality: 100, mozjpeg: true })
      .toFile(fullSizeOutputPath)
      .then(() => console.log(`Full-size created: ${file}`))
      .catch(err => console.error(err));
  }

  if (!fs.existsSync(thumbnailsOutputPath)) {
    sharp(inputPath)
      .resize({ width: 600 })
      .jpeg({ quality: 70, mozjpeg: true })
      .toFile(thumbnailsOutputPath)
      .then(() => console.log(`Thumbnail created: ${file}`))
      .catch(err => console.error(err));
  }
}
