// Single source of truth for species naming, shared by the app (Gallery.jsx,
// SpeciesIndex.jsx) and the post-build static page generator. photos.json
// stores only the Latin name, so everything user-facing goes through here.

// Some entries list more than one species ("Egretta garzetta · Threskiornis
// aethiopicus"), separated by "·" — split so each name is handled on its own
export const splitSpecies = species =>
  species.split("·").map(name => name.trim()).filter(Boolean);

export const SPECIES_IT = {
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

// A species with no entry above falls back to its Latin name, so adding a
// photo of an unlisted bird degrades to something correct rather than blank
export const commonName = latin => SPECIES_IT[latin] ?? latin;

// Backs the static /s/<slug>/ pages. Derived from the Italian name (it is what
// people search for); baked into URLs, so renaming a species here breaks the
// old one — same caveat as photo-id.mjs.
export const speciesSlug = latin =>
  commonName(latin)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

// Every species in the manifest, ordered by Italian name
export const collectSpecies = photos =>
  Array.from(
    new Set(photos.flatMap(photo => (photo.species ? splitSpecies(photo.species) : []))),
  ).sort((a, b) => commonName(a).localeCompare(commonName(b), "it"));
