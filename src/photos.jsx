import CryptoJS from "crypto-js";

let urls = import.meta.glob('../generated_photos/fullsize/*.jpg', {eager: true, import: 'default'});
let thumbnailUrls = import.meta.glob('../generated_photos/thumbnails/*.jpg', {eager: true, import: 'default'});

let photos = [
  {filename: "IMG_2971", title: "Aironi Cenerini"},
  {filename: "IMG_2990", title: "Aironi Cenerini"},
  {filename: "IMG_6501", title: "Garzetta"},
  {filename: "IMG_6854", title: "Cicogna"},
  {filename: "IMG_5319", title: "Cenerino e Ibis"},
  {filename: "IMG_5703", title: "Cormorano"},
  {filename: "IMG_4100", title: "Giovane Airone Rosso"},
  {filename: "IMG_3292", title: "Guardabuoi e Garzetta"},
  {filename: "IMG_3511", title: "Garzetta"},
  {filename: "IMG_3807", title: "Airone Rosso"},
  {filename: "IMG_3817", title: "Airone Rosso"},
  {filename: "IMG_3943", title: "Nitticora"},
  {filename: "IMG_4044", title: "Gruccione"},
  {filename: "IMG_4087", title: "Airone Cenerino"},
  {filename: "IMG_4188", title: "Airone Cenerino"},
  {filename: "IMG_4198", title: "Airone Cenerino"},
  {filename: "IMG_4344", title: "Airone Cenerino"},
  {filename: "IMG_4399", title: "Airone Cenerino"},
  {filename: "IMG_4480", title: "Gallinella d'acqua"},
  {filename: "IMG_4572", title: "Cicogna"},
  {filename: "IMG_5284", title: "Airone Bianco Maggiore"},
  {filename: "IMG_5321", title: "Aironi Bianchi Maggiori"},
  {filename: "IMG_5470", title: "Cicogne"},
  {filename: "IMG_5776", title: "Airone Bianco Maggiore"},
  {filename: "IMG_5778", title: "Airone Cenerino"},
  {filename: "IMG_5790", title: "Airone Cenerino"},
  {filename: "IMG_5730", title: "Ibis Sacro e Germano Reale"},
  {filename: "IMG_5801", title: "Airone Cenerino"},
  {filename: "IMG_5793", title: "Airone Cenerino"},
  {filename: "IMG_5797", title: "Airone Cenerino"},
  {filename: "IMG_4937", title: "Fagiano"},
  {filename: "IMG_5849", title: "Parrocchetti"},
  {filename: "IMG_5872", title: "Airone Bianco Maggiore"},
  {filename: "IMG_5893", title: "Airone Cenerino"},
  {filename: "IMG_6197", title: "Oca Selvatica"},
  {filename: "IMG_6229", title: "Airone Bianco Maggiore"},
  {filename: "IMG_6354", title: "Airone Cenerino"},
];

export default photos.map(photo => {
  const thumbnail = thumbnailUrls[`../generated_photos/thumbnails/${photo.filename}.jpg`];
  const url = urls[`../generated_photos/fullsize/${photo.filename}.jpg`];
  const id = `${photo.title.replace(/ /g, "-")}-${CryptoJS.MD5(photo.filename).toString()}`;
  return {src: url, thumbnail, title: photo.title, id};
});
