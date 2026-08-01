// Which photo backs the hero, at which viewport, and where the breakpoint
// between the two sits. Shared by the gallery (Gallery.jsx), the static page
// generator (the preload tags it injects into dist/index.html) and
// generate-photos.js, which has to build the hero rendition of exactly the
// photos this resolves to.
//
// photos.json may name heroSmall (narrow viewports) and heroLarge (wide ones,
// where object-fit: cover crops a tall photo the most) separately; a plain
// hero: true entry backs whichever of the two is missing, and the first entry
// — the most recent shot — backs that in turn, so a manifest with no flag at
// all still has a hero.
//
// The three used to work this out on their own, and the fallback was the part
// that broke: an entry flagged heroLarge with no hero: true anywhere left the
// small viewport on photos[0], a different photo every time a newer one is
// added and one nobody had generated a hero rendition for — so the page fell
// back to the multi-megabyte full-size copy as its background, with no preload.
export const HERO_LARGE_QUERY = "(min-width: 1024px)";
// The other half of the same breakpoint, for the preload <link media> that
// must not fire on wide viewports. Kept next to its twin so the two cannot
// drift apart into a range that overlaps or leaves a gap.
export const HERO_SMALL_QUERY = "(max-width: 1023.98px)";

// Takes either manifest entries or the mapped photos of src/photos.jsx — both
// carry the three flags.
export const resolveHeroes = photos => {
  const fallback = photos.find(photo => photo.hero) ?? photos[0];
  return {
    small: photos.find(photo => photo.heroSmall) ?? fallback,
    large: photos.find(photo => photo.heroLarge) ?? fallback,
  };
};
