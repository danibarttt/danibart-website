const fs = require("fs");
const path = require("path");

const photosDir = path.join(process.cwd(), "photos");
const manifest = require("../photos.json");

const files = fs.readdirSync(photosDir)
  .filter(f => f.endsWith(".jpg"))
  .map(f => path.basename(f, ".jpg"));

const listed = manifest.map(p => p.filename);

const missingFromManifest = files.filter(f => !listed.includes(f));
const missingFromDir = listed.filter(f => !files.includes(f));

if (missingFromManifest.length > 0 || missingFromDir.length > 0) {
  for (const f of missingFromManifest) {
    console.error(`ERRORE: photos/${f}.jpg non ha una voce in src/photos.json`);
  }
  for (const f of missingFromDir) {
    console.error(`ERRORE: src/photos.json elenca "${f}" ma photos/${f}.jpg non esiste`);
  }
  process.exit(1);
}

console.log(`Check foto ok: ${files.length} foto, tutte presenti nel manifest.`);
