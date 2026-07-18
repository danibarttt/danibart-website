import CryptoJS from "crypto-js";
import photos from "../photos.json";

let urls = import.meta.glob('../generated_photos/fullsize/*.jpg', {eager: true, import: 'default'});
let thumbnailUrls = import.meta.glob('../generated_photos/thumbnails/*.jpg', {eager: true, import: 'default'});
let heroUrls = import.meta.glob('../generated_photos/hero/*.jpg', {eager: true, import: 'default'});

export default photos.map(photo => {
  const thumbnail = thumbnailUrls[`../generated_photos/thumbnails/${photo.filename}.jpg`];
  const url = urls[`../generated_photos/fullsize/${photo.filename}.jpg`];
  const heroSrc = photo.hero ? heroUrls[`../generated_photos/hero/${photo.filename}.jpg`] : undefined;
  const id = `${photo.title.replace(/ /g, "-")}-${CryptoJS.MD5(photo.filename).toString()}`;
  return {src: url, thumbnail, heroSrc, title: photo.title, description: photo.description, hero: photo.hero, id};
});
