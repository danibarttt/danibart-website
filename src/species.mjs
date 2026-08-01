// Single source of truth for species naming, shared by the app (Gallery.jsx,
// SpeciesIndex.jsx) and the post-build static page generator. photos.json
// stores only the Latin name, so everything user-facing goes through here.

// Some entries list more than one species ("Egretta garzetta · Threskiornis
// aethiopicus") — split so each name is handled on its own. "·" is the
// canonical separator, but it is not a character any keyboard offers, so a
// comma or a semicolon is accepted too: generate-photos.js rewrites the
// manifest into the canonical spelling (canonicalSpecies below), and until it
// runs every reader here already understands what was typed. A binomial never
// contains either character, so there is nothing to mis-split.
export const splitSpecies = species =>
  species.split(/[·,;\n]/).map(name => name.trim()).filter(Boolean);

export const SPECIES_SEPARATOR = " · ";

// The spelling generate-photos.js writes back into photos.json
export const canonicalSpecies = species => splitSpecies(species).join(SPECIES_SEPARATOR);

const SPECIES_IT = {
  "Actitis hypoleucos": "Piro piro piccolo",
  "Anser anser": "Oca selvatica",
  "Ardea alba": "Airone bianco maggiore",
  "Ardea cinerea": "Airone cenerino",
  "Ardea purpurea": "Airone rosso",
  "Bubulcus ibis": "Airone guardabuoi",
  "Ciconia ciconia": "Cicogna",
  "Egretta garzetta": "Garzetta",
  "Gallinula chloropus": "Gallinella d'acqua",
  "Merops apiaster": "Gruccione",
  "Nycticorax nycticorax": "Nitticora",
  "Phalacrocorax carbo": "Cormorano",
  "Psittacula krameri": "Parrocchetto dal collare",
  "Streptopelia turtur": "Tortora selvatica",
  "Threskiornis aethiopicus": "Ibis sacro",
};

// Sentence case like the Italian names above, not the initial-capped form
// ornithology uses ("Grey Heron"): these run inside chips, captions and
// sentences, where the capitals would read as shouting.
const SPECIES_EN = {
  "Actitis hypoleucos": "Common sandpiper",
  "Anser anser": "Greylag goose",
  "Ardea alba": "Great egret",
  "Ardea cinerea": "Grey heron",
  "Ardea purpurea": "Purple heron",
  "Bubulcus ibis": "Cattle egret",
  "Ciconia ciconia": "White stork",
  "Egretta garzetta": "Little egret",
  "Gallinula chloropus": "Common moorhen",
  "Merops apiaster": "European bee-eater",
  "Nycticorax nycticorax": "Black-crowned night heron",
  "Phalacrocorax carbo": "Great cormorant",
  "Psittacula krameri": "Rose-ringed parakeet",
  "Streptopelia turtur": "European turtle dove",
  "Threskiornis aethiopicus": "African sacred ibis",
};

const NAMES = { it: SPECIES_IT, en: SPECIES_EN };

// A species with no entry above falls back to its Latin name, so adding a
// photo of an unlisted bird degrades to something correct rather than blank —
// and one whose English name is missing degrades to the Italian one.
export const commonName = (latin, lang = "it") =>
  NAMES[lang]?.[latin] ?? SPECIES_IT[latin] ?? latin;

const slugify = name =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

// The canonical, language-independent slug: derived from the Italian name and
// baked into both the /s/<slug>/ URLs and the gallery's ?specie= parameter, so
// renaming a species here breaks the old one — same caveat as photo-id.mjs.
// The English pages keep using it for their filter links, where it is an
// opaque id rather than a word anyone reads.
export const speciesSlug = latin => slugify(commonName(latin, "it"));

// The English species pages get their own slugs (/en/s/grey-heron/): they are
// new URLs with nothing to break, and being found in English is their whole
// reason to exist.
export const speciesSlugFor = (latin, lang) => slugify(commonName(latin, lang));

/* ---------- manifest audit ---------- */

// Which species photos.json names that the maps above have no entry for.
// Run by generate-photos.js — the first thing both dev and build execute — and
// again by the static page generator, which the dev server re-runs on its own
// whenever the manifest changes.
//
// Both names are required, and a missing one stops the run rather than warning.
// The fallbacks are still there and still correct (the Latin name for a missing
// Italian one, the Italian for a missing English one), but neither is a state
// worth *publishing*: a species page's URL is built from its name, so filling
// the name in later moves an address that has already been shared and indexed
// — /s/falco-peregrinus/ becoming /s/falco-pellegrino/, /en/s/airone-cenerino/
// becoming /en/s/grey-heron/. One rule, both languages: a new species means
// two lines in this file, at the same time as the photo.
export const auditSpecies = photos => {
  const named = new Map();
  for (const photo of photos) {
    if (!photo.species) continue;
    for (const latin of splitSpecies(photo.species)) {
      if (!named.has(latin)) named.set(latin, photo.filename);
    }
  }
  return [...named]
    .map(([latin, filename]) => ({
      latin,
      filename,
      missing: [!SPECIES_IT[latin] && "it", !SPECIES_EN[latin] && "en"].filter(Boolean),
    }))
    .filter(entry => entry.missing.length > 0);
};

// The message lives here so both callers print the same thing: the lines to
// paste, and why it cannot simply be done after publishing.
export const missingSpeciesMessage = ({ latin, filename, missing }) =>
  [
    `ERROR: no ${missing.length === 2 ? "common name" : missing[0] === "it" ? "Italian name" : "English name"} for "${latin}" (photos/${filename}.jpg) in src/species.mjs`,
    `       Add the missing line(s) there:`,
    ...(missing.includes("it") ? [`         SPECIES_IT: "${latin}": "Nome italiano",`] : []),
    ...(missing.includes("en") ? [`         SPECIES_EN: "${latin}": "English name",`] : []),
    `       Now rather than later: the species page URL is built from the name,`,
    `       so filling it in after publishing moves an address already shared.`,
  ].join("\n");

// Every species in the manifest, ordered by its name in the given language
export const collectSpecies = (photos, lang = "it") =>
  Array.from(
    new Set(photos.flatMap(photo => (photo.species ? splitSpecies(photo.species) : []))),
  ).sort((a, b) => commonName(a, lang).localeCompare(commonName(b, lang), lang));
