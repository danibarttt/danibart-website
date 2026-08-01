import photos from "../photos.json";
import {photoId} from "./photo-id.mjs";
import metadata from "../generated_photos/metadata.json";

let urls = import.meta.glob('../generated_photos/fullsize/*.jpg', {eager: true, import: 'default'});
let slideUrls = import.meta.glob('../generated_photos/slides/*.jpg', {eager: true, import: 'default'});
let originalUrls = import.meta.glob('../generated_photos/original/*.jpg', {eager: true, import: 'default'});
let thumbnailUrls = import.meta.glob('../generated_photos/thumbnails/*.jpg', {eager: true, import: 'default'});
let thumbnailWebpUrls = import.meta.glob('../generated_photos/thumbnails/*.webp', {eager: true, import: 'default'});
let thumbnailAvifUrls = import.meta.glob('../generated_photos/thumbnails/*.avif', {eager: true, import: 'default'});
let heroUrls = import.meta.glob('../generated_photos/hero/*.jpg', {eager: true, import: 'default'});
let heroWebpUrls = import.meta.glob('../generated_photos/hero/*.webp', {eager: true, import: 'default'});
let heroAvifUrls = import.meta.glob('../generated_photos/hero/*.avif', {eager: true, import: 'default'});

export default photos.map(photo => {
  const thumbnail = thumbnailUrls[`../generated_photos/thumbnails/${photo.filename}.jpg`];
  const thumbnailWebp = thumbnailWebpUrls[`../generated_photos/thumbnails/${photo.filename}.webp`];
  const thumbnailAvif = thumbnailAvifUrls[`../generated_photos/thumbnails/${photo.filename}.avif`];
  const url = urls[`../generated_photos/fullsize/${photo.filename}.jpg`];
  const original = originalUrls[`../generated_photos/original/${photo.filename}.jpg`];
  const isHero = photo.hero || photo.heroSmall || photo.heroLarge;
  const heroSrc = isHero ? heroUrls[`../generated_photos/hero/${photo.filename}.jpg`] : undefined;
  const heroWebp = isHero ? heroWebpUrls[`../generated_photos/hero/${photo.filename}.webp`] : undefined;
  const heroAvif = isHero ? heroAvifUrls[`../generated_photos/hero/${photo.filename}.avif`] : undefined;
  const id = photoId(photo);
  const meta = metadata[photo.filename] ?? {};
  // Downscaled lightbox renditions (generate-photos.js SLIDE_WIDTHS) plus the
  // full-size photo, as a yarl srcSet so each device downloads the smallest
  // sufficient file. Entries at the photo's native width (withoutEnlargement
  // re-encodes) duplicate the full-size one and are dropped.
  const srcSet = [1280, 2048]
    .map(width => ({
      src: slideUrls[`../generated_photos/slides/${photo.filename}-${width}.jpg`],
      width: Math.min(width, meta.width),
      height: Math.round((meta.height * Math.min(width, meta.width)) / meta.width),
    }))
    .filter(entry => entry.src && entry.width < meta.width);
  srcSet.push({src: url, width: meta.width, height: meta.height});
  return {
    src: url,
    srcSet,
    original,
    thumbnail,
    thumbnailWebp,
    thumbnailAvif,
    heroSrc,
    heroWebp,
    heroAvif,
    title: photo.title,
    species: photo.species,
    description: photo.description,
    position: photo.position,
    hero: photo.hero,
    heroSmall: photo.heroSmall,
    heroLarge: photo.heroLarge,
    id,
    width: meta.width,
    height: meta.height,
    blur: meta.blur,
    exif: meta.exif,
    dateTaken: meta.dateTaken,
  };
});
