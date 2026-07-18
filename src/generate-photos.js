const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = path.join(process.cwd(), "photos");
const thumbnailsOutputDir = path.join(process.cwd(), "generated_photos/thumbnails");
const fullSizeOutputDir = path.join(process.cwd(), "generated_photos/fullsize");

fs.mkdirSync(thumbnailsOutputDir, { recursive: true });
fs.mkdirSync(fullSizeOutputDir, { recursive: true });

const files = fs.readdirSync(inputDir);

for (const file of files.filter(file => file.endsWith(".jpg"))) {
  const inputPath = path.join(inputDir, file);
  const fullSizeOutputPath = path.join(fullSizeOutputDir, file);
  const thumbnailsOutputPath = path.join(thumbnailsOutputDir, file);

  sharp(inputPath)
    .jpeg({ quality: 100, mozjpeg: true })
    .toFile(fullSizeOutputPath)
    .then(() => console.log(`Full-size created: ${file}`))
    .catch(err => console.error(err));

  sharp(inputPath)
    .resize({ width: 600 })
    .jpeg({ quality: 70, mozjpeg: true })
    .toFile(thumbnailsOutputPath)
    .then(() => console.log(`Thumbnail created: ${file}`))
    .catch(err => console.error(err));
}
