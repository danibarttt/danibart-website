import {md5} from "./md5.mjs";

// Single source of truth for the per-photo URL id, shared by the app
// (src/photos.jsx) and the post-build social pages script. Ids are baked
// into shared /p/<id>/ URLs, so any change here breaks previously shared
// links for photos whose slug changes.
const slug = title =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const photoId = photo =>
  `${slug(photo.title)}-${md5(photo.filename)}`;
