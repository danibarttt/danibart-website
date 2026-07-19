import photos from "../photos.json";
import {photoId} from "./photo-id.mjs";
import metadata from "../generated_photos/metadata.json";

let urls = import.meta.glob('../generated_photos/fullsize/*.jpg', {eager: true, import: 'default'});
let thumbnailUrls = import.meta.glob('../generated_photos/thumbnails/*.jpg', {eager: true, import: 'default'});
let thumbnailWebpUrls = import.meta.glob('../generated_photos/thumbnails/*.webp', {eager: true, import: 'default'});
let heroUrls = import.meta.glob('../generated_photos/hero/*.jpg', {eager: true, import: 'default'});
let heroWebpUrls = import.meta.glob('../generated_photos/hero/*.webp', {eager: true, import: 'default'});

export default photos.map(photo => {
  const thumbnail = thumbnailUrls[`../generated_photos/thumbnails/${photo.filename}.jpg`];
  const thumbnailWebp = thumbnailWebpUrls[`../generated_photos/thumbnails/${photo.filename}.webp`];
  const url = urls[`../generated_photos/fullsize/${photo.filename}.jpg`];
  const heroSrc = photo.hero ? heroUrls[`../generated_photos/hero/${photo.filename}.jpg`] : undefined;
  const heroWebp = photo.hero ? heroWebpUrls[`../generated_photos/hero/${photo.filename}.webp`] : undefined;
  const id = photoId(photo);
  const meta = metadata[photo.filename] ?? {};
  return {
    src: url,
    thumbnail,
    thumbnailWebp,
    heroSrc,
    heroWebp,
    title: photo.title,
    species: photo.species,
    description: photo.description,
    hero: photo.hero,
    id,
    width: meta.width,
    height: meta.height,
    blur: meta.blur,
    exif: meta.exif,
  };
});
