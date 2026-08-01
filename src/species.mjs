// Single source of truth for species naming, shared by the app (Gallery.jsx,
// SpeciesIndex.jsx) and the post-build static page generator. photos.json
// stores only the Latin name, so everything user-facing goes through here.

// Some entries list more than one species ("Egretta garzetta · Threskiornis
// aethiopicus"), separated by "·" — split so each name is handled on its own
export const splitSpecies = species =>
  species.split("·").map(name => name.trim()).filter(Boolean);

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

// Every species in the manifest, ordered by its name in the given language
export const collectSpecies = (photos, lang = "it") =>
  Array.from(
    new Set(photos.flatMap(photo => (photo.species ? splitSpecies(photo.species) : []))),
  ).sort((a, b) => commonName(a, lang).localeCompare(commonName(b, lang), lang));
