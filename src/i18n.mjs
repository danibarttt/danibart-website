// Single source of truth for every user-facing string, shared by the React app
// (through src/lang.jsx) and the static page generator, the way species.mjs is
// for species naming. Nothing here may touch React — generate-static-pages.mjs
// imports it under plain Node.
//
// Two languages, and the same three-state / two-stored dance as the theme (see
// src/theme.mjs): no stored value means "follow the browser", and picking the
// language the browser already asks for *clears* the override rather than
// pinning it. That keeps a visitor who never touches the toggle on whatever
// their device says, forever.
//
// Italian is the original: it is what photos.json is written in, what the
// canonical URLs (/p/, /s/, ?specie=) are derived from, and the fallback for
// anything an English string is missing for.

export const LANGS = ["it", "en"];
export const DEFAULT_LANG = "it";
export const LANG_KEY = "lang";

export const isLang = value => LANGS.includes(value);

/* ---------- preference storage (browser only) ---------- */

// Private mode on iOS Safari throws on localStorage access rather than
// returning null, exactly as in theme.mjs
const readStore = key => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStore = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the choice just will not survive the visit */
  }
};

// Anything Italian gets the Italian site; everyone else gets English. The
// site is written for an Italian audience first, so "it" is the specific
// case and English is the catch-all rather than the other way round.
export const systemLang = () => {
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  const first = tags.find(Boolean) ?? "";
  return first.toLowerCase().startsWith("it") ? "it" : "en";
};

export const storedLang = () => {
  const value = readStore(LANG_KEY);
  return isLang(value) ? value : null;
};

export const activeLang = () => storedLang() ?? systemLang();

// Choosing the language the browser already asks for clears the override, so
// the site goes back to following the device afterwards — same as setTheme
export const setLang = lang => {
  writeStore(LANG_KEY, lang === systemLang() ? null : lang);
  document.documentElement.lang = lang;
};

// Keeps an un-overridden page in step if the browser language changes. Unlike
// prefers-color-scheme there is no media query for it, so this only fires on
// another tab writing the same key — which is exactly the case worth handling.
export const watchStoredLang = onChange => {
  const handler = event => {
    if (event.key === LANG_KEY || event.key === null) onChange(activeLang());
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};

/* ---------- per-photo text ---------- */

// photos.json is written in Italian and carries optional titleEn/descriptionEn
// alongside. A photo added without them falls back to the Italian text rather
// than to nothing, so the site never shows a blank caption while a translation
// is still pending.
export const photoTitle = (photo, lang) =>
  (lang === "en" && photo.titleEn) || photo.title;

export const photoDescription = (photo, lang) =>
  (lang === "en" && photo.descriptionEn) || photo.description;

// The Italian pages keep the URLs they have always had; English gets an /en/
// prefix. Ids and species slugs are unchanged — see photo-id.mjs.
export const photoPath = (id, lang) => (lang === "en" ? `/en/p/${id}/` : `/p/${id}/`);
export const speciesPath = (slug, lang) => (lang === "en" ? `/en/s/${slug}/` : `/s/${slug}/`);
export const speciesIndexPath = lang => (lang === "en" ? "/en/s/" : "/s/");
// The one path whose own segment is translated. Everywhere else a URL segment
// is an id — a photo's, a species' — and an id is never translated, or the two
// languages would stop naming the same thing. This page has no id: it is a
// page, nothing points at it but the footer and the license fields of the
// structured data, and both are built per language.
export const licensePath = lang => (lang === "en" ? "/en/license/" : "/licenza/");

/* ---------- strings ---------- */

// Parameterized strings are functions rather than templates with placeholders:
// plural agreement and word order differ enough between the two languages that
// a "{n} scatti" style format string would need escape hatches anyway.

const IT = {
  htmlLang: "it",
  ogLocale: "it_IT",
  dateLocale: "it-IT",
  siteName: "Daniele Bartorilla — Fotografia Naturalistica",
  siteDescription:
    "Fotografia naturalistica di Daniele Bartorilla: aironi e altri uccelli delle zone umide.",
  tagline: "Fotografia naturalistica",

  navGallery: "Galleria",
  navSpecies: "Specie",
  navNumbers: "Numeri",
  navAbout: "Chi sono",
  navContact: "Contatti",

  themeToLight: "Passa al tema chiaro",
  themeToDark: "Passa al tema scuro",
  themeLight: "Tema chiaro",
  themeDark: "Tema scuro",
  themeChange: "Cambia tema",
  // Worded in the language it switches *to*: the visitor who needs this button
  // is by definition the one who cannot read the current language
  langSwitch: "Switch to English",
  langSwitchName: "English",
  langCode: "EN",

  menuOpen: "Apri il menu",
  menuClose: "Chiudi il menu",
  menuLabel: "Menu di navigazione",

  filterSpecies: "Filtra per specie",
  filterYear: "Filtra per anno",
  filterAll: "Tutte",
  filterAnyYear: "Sempre",

  heroTagline:
    "Aironi, cormorani e gli altri abitanti delle zone umide, raccontati attraverso l'obiettivo.",

  featuredOverline: "Scatto della settimana",
  featuredTitle: "In evidenza",
  featuredOpen: title => `Apri ${title} nella galleria`,

  galleryOverline: "Portfolio",
  galleryTitle: "Galleria",
  galleryCountAll: n => `${n} scatti tra risaie, lanche e garzaie`,
  galleryCount: (n, species, year) =>
    [
      n === 1 ? "1 scatto" : `${n} scatti`,
      species && `di ${species}`,
      year && `nel ${year}`,
    ]
      .filter(Boolean)
      .join(" "),
  galleryEmpty: "Nessuno scatto con questi filtri.",
  galleryShowAll: "Mostra tutti",
  galleryNew: "Nuova",

  // The two cards below the gallery, one per sub-page: they are the only way
  // into /specie and /numeri that does not go through the nav
  previewSpeciesOverline: "Indice",
  previewSpeciesTitle: "Le specie fotografate",
  previewSpeciesSub: "Tutte le specie della galleria, ciascuna con i suoi scatti.",
  previewSpeciesCta: "Sfoglia il catalogo",
  previewStatsOverline: "Dati di scatto",
  previewStatsTitle: "I numeri dietro le foto",
  previewStatsSub:
    "Stagioni, orari, luoghi e attrezzatura: le mie uscite raccontate in grafici.",
  previewStatsCta: "Guarda le statistiche",
  previewStatShots: "scatti",
  previewStatSpecies: "specie",
  previewStatPlaces: n => (n === 1 ? "zona" : "zone"),

  aboutOverline: "Chi sono",
  aboutTitle: "Dietro l'obiettivo",
  aboutPortrait: "Ritratto di Daniele Bartorilla",
  aboutP1:
    "Mi chiamo Daniele Bartorilla, informatico di professione e fotografo naturalista per passione, con una predilezione per gli uccelli delle zone umide: aironi, garzette, cormorani e i loro vicini di casa.",
  aboutP2:
    "Scatto principalmente nel Pavese, tra risaie, lanche e garzaie. Mi piace fotografare la natura nelle prime ore del mattino o al tramonto, quando la luce è più morbida. In questo sito raccolgo le foto a cui tengo di più, spero ti piacciano!",

  contactsOverline: "Contatti",
  contactsTitle: "Scrivimi",
  contactsSub:
    "Una domanda, una proposta o solo voglia di parlare di fotografia? Questa è la mia email:",

  lightboxDetails: "Dettagli",
  lightboxDetailsTitle: "Apri la scheda della foto",
  lightboxDetailsAria: "Apri la scheda della foto, in alta definizione",
  lightboxShare: "Condividi",
  lightboxShareAria: "Condividi la foto",
  lightboxLinkCopied: "Link copiato negli appunti",
  lightboxCopyFailed: "Copia del link non riuscita",
  lightboxPrevious: "Precedente",
  lightboxNext: "Successiva",
  lightboxClose: "Chiudi",
  lightboxPlay: "Avvia la presentazione",
  lightboxPause: "Metti in pausa la presentazione",

  backToGallery: "← Torna alla galleria",

  speciesIndexOverline: "Indice",
  speciesIndexTitle: "Specie fotografate",
  speciesIndexSub: (species, shots) =>
    `${species} specie in ${shots} scatti. Tocca una specie per vederne tutte le foto.`,
  speciesIndexLede: (species, shots) => `${species} specie, ${shots} scatti.`,
  speciesIndexDescription: n =>
    `Le ${n} specie di uccelli presenti nella galleria di Daniele Bartorilla, con tutte le foto di ciascuna.`,
  shots: n => (n === 1 ? "1 scatto" : `${n} scatti`),
  photographs: n => (n === 1 ? "1 fotografia" : `${n} fotografie`),
  speciesAllLink: "Tutte le specie",
  speciesPageTitle: (name, latin) => `${name} (${latin}) — foto di Daniele Bartorilla`,
  speciesPageDescription: (count, name, latin) =>
    `${count} di ${name.toLowerCase()} (${latin}) nella galleria di fotografia naturalistica di Daniele Bartorilla.`,

  statsOverline: "Dietro le quinte",
  statsTitle: "Numeri",
  statsSub:
    "Cosa raccontano i dati di scatto delle foto in galleria: quando esco, cosa incontro e con che impostazioni.",
  // Abbreviated for the axis of the monthly chart, which has a column's width
  // and no more. Everywhere a month is named in running text — the caption,
  // the column tooltip, the mobile row, the span under the shot count — there
  // is room to spell it out, so those read monthsFull instead.
  months: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  monthsFull: [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ],
  statPublished: "Scatti pubblicati",
  statSpecies: "Specie",
  statSpeciesSub: name => `la più frequente è ${name}`,
  statFocal: "Focale preferita",
  statAperture: "Diaframma più usato",
  statOfShots: (n, total) => `in ${n} scatti su ${total}`,
  chartMonths: busiest =>
    `Scatti per mese${busiest ? ` — il mese più prolifico è ${busiest.full}, con ${busiest.value}` : ""}`,
  chartSpecies: "Specie più fotografate — tocca una barra per vedere gli scatti",
  chartHours: "Ora del giorno — l'orario registrato dalla fotocamera",
  chartIso: "Sensibilità ISO",
  hourLabel: hour => `ore ${hour}:00`,
  isoLabel: iso => `ISO ${iso}`,
  chartRegionsOne: region => `Dove scatto — tutto in ${region}`,
  chartRegionsMany: n => `Dove scatto — ${n} zone`,
  regionMapAria: list =>
    `Mappa d'Italia con evidenziate le regioni degli scatti: ${list}`,
  regionAllShots: n => `tutti i ${n} scatti in galleria`,
  regionSomeShots: (n, total) => `${n} scatti su ${total}`,
  regionNote: (n, total) => `Zona indicata su ${n} scatti su ${total}.`,
  gearHeading: "Attrezzatura",
  gearBody: "Corpo macchina",
  gearLens: "Obiettivo",

  footerRights: year =>
    `© ${year} Daniele Bartorilla. Tutti i diritti sul sito, relativi contenuti e foto sono riservati.`,
  footerPrivacy: "Privacy Policy",
  footerCookie: "Cookie Policy",
  footerLicense: "Licenza d'uso",

  licenseOverline: "Diritti",
  licenseTitle: "Licenza d'uso",
  licenseDescription:
    "Condizioni d'uso delle fotografie di Daniele Bartorilla e come richiederne la licenza.",
  licenseLede:
    "Le fotografie pubblicate su questo sito sono opere protette dal diritto d'autore: sono tutte © Daniele Bartorilla, nessuna è di pubblico dominio e nessuna è libera da diritti.",
  licenseTermsHeading: "Cosa non è consentito",
  licenseTermsBody:
    "Senza una mia autorizzazione scritta le immagini non possono essere scaricate, copiate, ripubblicate, modificate, ritagliate o rivendute, né a scopo di lucro né gratuitamente. Contano come pubblicazione anche i social network, i blog, la stampa, i materiali pubblicitari e l'addestramento di modelli di intelligenza artificiale.",
  licenseAcquireHeading: "Come ottenere una licenza",
  licenseAcquireBody:
    "Le fotografie possono essere concesse in licenza, valutando caso per caso. Scrivimi indicando quale ti interessa — basta il link alla sua pagina —, dove vorresti pubblicarla e per quanto tempo: ti rispondo con condizioni e costi.",
  licenseCreditHeading: "Credito",
  licenseCreditBody:
    "Ogni utilizzo autorizzato va accompagnato dalla dicitura «© Daniele Bartorilla», accanto all'immagine o nei crediti fotografici.",

  photoOverline: "Scatto",
  photoOpenInGallery: "Apri nella galleria",
  photoPrev: "Foto precedente",
  photoNext: "Foto successiva",
  photoFallbackDescription: "Fotografia naturalistica di Daniele Bartorilla",
  exifTaken: "Scattata il",
  exifCamera: "Fotocamera",
  exifLens: "Obiettivo",
  exifFocal: "Focale",
  exifAperture: "Diaframma",
  exifExposure: "Tempo",
  exifIso: "ISO",
  placeLabel: "Scattata in",
  placeCountry: "Italia",
  placeMapAria: region => `${region} evidenziata sulla mappa d'Italia`,
  pinAria: "Luogo dello scatto",
  jobTitle: "Fotografo naturalista",
  // Escalating page-title qualifiers, see buildPageTitles in the generator
  titleWithDate: (title, date) => `${title}, ${date}`,
  titleWithTime: (title, date, time) => `${title}, ${date} alle ${time}`,
  titleWithIndex: (title, position, total) => `${title} (${position} di ${total})`,
};

const EN = {
  htmlLang: "en",
  ogLocale: "en_GB",
  dateLocale: "en-GB",
  siteName: "Daniele Bartorilla — Wildlife Photography",
  siteDescription:
    "Wildlife photography by Daniele Bartorilla: herons and other birds of the wetlands.",
  tagline: "Wildlife photography",

  navGallery: "Gallery",
  navSpecies: "Species",
  navNumbers: "Numbers",
  navAbout: "About",
  navContact: "Contact",

  // English UI microcopy drops the article the Italian keeps ("Apri il menu")
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",
  themeLight: "Light theme",
  themeDark: "Dark theme",
  themeChange: "Change theme",
  langSwitch: "Passa all'italiano",
  langSwitchName: "Italiano",
  langCode: "IT",

  menuOpen: "Open menu",
  menuClose: "Close menu",
  menuLabel: "Navigation menu",

  filterSpecies: "Filter by species",
  filterYear: "Filter by year",
  filterAll: "All",
  filterAnyYear: "Any year",

  heroTagline:
    "Herons, cormorants and the other inhabitants of the wetlands, seen through the lens.",

  featuredOverline: "Shot of the week",
  featuredTitle: "Featured",
  featuredOpen: title => `Open ${title} in the gallery`,

  galleryOverline: "Portfolio",
  galleryTitle: "Gallery",
  galleryCountAll: n => `${n} shots among rice paddies, oxbow lakes and heronries`,
  // "of grey heron" is agrammatical in English — a singular common name needs
  // its determiner, where the Italian "di airone cenerino" takes none
  galleryCount: (n, species, year) =>
    [
      n === 1 ? "1 shot" : `${n} shots`,
      species && `of the ${species.toLowerCase()}`,
      year && `in ${year}`,
    ]
      .filter(Boolean)
      .join(" "),
  galleryEmpty: "No shots match these filters.",
  galleryShowAll: "Show all",
  galleryNew: "New",

  previewSpeciesOverline: "Index",
  previewSpeciesTitle: "The species photographed",
  previewSpeciesSub: "Every species in the gallery, each with its own shots.",
  previewSpeciesCta: "Browse the catalogue",
  previewStatsOverline: "Shooting data",
  previewStatsTitle: "The numbers behind the photos",
  previewStatsSub:
    "Seasons, hours, places and gear: my outings told in charts.",
  previewStatsCta: "See the statistics",
  previewStatShots: "shots",
  previewStatSpecies: "species",
  previewStatPlaces: n => (n === 1 ? "area" : "areas"),

  aboutOverline: "About me",
  aboutTitle: "Behind the lens",
  aboutPortrait: "Portrait of Daniele Bartorilla",
  aboutP1:
    "My name is Daniele Bartorilla. I work in software and photograph wildlife for the love of it, with a soft spot for the birds of the wetlands: herons, egrets, cormorants and their neighbours.",
  aboutP2:
    "I shoot mostly around Pavia, in northern Italy, among rice paddies, oxbow lakes and heronries. I like photographing nature in the early morning or at sunset, when the light is at its softest. This site collects the photographs I am fondest of, I hope you enjoy them!",

  contactsOverline: "Contact",
  contactsTitle: "Drop me a line",
  contactsSub:
    "A question, a proposal, or just fancy a chat about photography? Here is my email:",

  lightboxDetails: "Details",
  lightboxDetailsTitle: "Open the photo's own page",
  lightboxDetailsAria: "Open the photo's own page, in high resolution",
  lightboxShare: "Share",
  lightboxShareAria: "Share the photo",
  lightboxLinkCopied: "Link copied to clipboard",
  lightboxCopyFailed: "Could not copy the link",
  lightboxPrevious: "Previous",
  lightboxNext: "Next",
  lightboxClose: "Close",
  lightboxPlay: "Start the slideshow",
  lightboxPause: "Pause the slideshow",

  backToGallery: "← Back to the gallery",

  speciesIndexOverline: "Index",
  speciesIndexTitle: "Species photographed",
  speciesIndexSub: (species, shots) =>
    `${species} species across ${shots} shots. Tap a species to see all of its photos.`,
  speciesIndexLede: (species, shots) => `${species} species, ${shots} shots.`,
  speciesIndexDescription: n =>
    `The ${n} bird species in Daniele Bartorilla's gallery, each with all of its photographs.`,
  shots: n => (n === 1 ? "1 shot" : `${n} shots`),
  photographs: n => (n === 1 ? "1 photograph" : `${n} photographs`),
  speciesAllLink: "All species",
  speciesPageTitle: (name, latin) => `${name} (${latin}) — photos by Daniele Bartorilla`,
  speciesPageDescription: (count, name, latin) =>
    `${count} of the ${name.toLowerCase()} (${latin}) in Daniele Bartorilla's wildlife photography gallery.`,

  statsOverline: "Behind the scenes",
  // The nav keeps the terse "Numbers"; the page heading has room for the
  // English idiom, which the bare noun does not carry on its own
  statsTitle: "By the numbers",
  statsSub:
    "What the shooting data behind the gallery says: when I go out, what I run into and what settings I use.",
  // Capitalised, unlike the Italian ones: English capitalises month names
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  monthsFull: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  statPublished: "Published shots",
  statSpecies: "Species",
  statSpeciesSub: name => `the most frequent is the ${name}`,
  statFocal: "Favourite focal length",
  statAperture: "Most-used aperture",
  statOfShots: (n, total) => `in ${n} shots out of ${total}`,
  chartMonths: busiest =>
    `Shots per month${busiest ? ` — the busiest is ${busiest.full}, with ${busiest.value}` : ""}`,
  chartSpecies: "Most photographed species — tap a bar to see the shots",
  chartHours: "Time of day — as recorded by the camera",
  chartIso: "ISO sensitivity",
  hourLabel: hour => `${hour}:00`,
  isoLabel: iso => `ISO ${iso}`,
  chartRegionsOne: region => `Where I shoot — all of it in ${region}`,
  chartRegionsMany: n => `Where I shoot — ${n} areas`,
  regionMapAria: list => `Map of Italy with the regions of the shots highlighted: ${list}`,
  regionAllShots: n => `all ${n} shots in the gallery`,
  regionSomeShots: (n, total) => `${n} shots out of ${total}`,
  regionNote: (n, total) => `Area recorded for ${n} shots out of ${total}.`,
  gearHeading: "Gear",
  gearBody: "Camera body",
  gearLens: "Lens",

  footerRights: year =>
    `© ${year} Daniele Bartorilla. All rights to this site, its contents and its photographs are reserved.`,
  footerPrivacy: "Privacy Policy",
  footerCookie: "Cookie Policy",
  // "Licensing" rather than the noun, which British English spells "licence"
  // while the URL and the schema.org field are both "license"
  footerLicense: "Licensing",

  licenseOverline: "Rights",
  licenseTitle: "Licensing",
  licenseDescription:
    "The terms of use for Daniele Bartorilla's photographs, and how to license one.",
  licenseLede:
    "The photographs published on this site are copyright works: they are all © Daniele Bartorilla, none of them is in the public domain and none of them is royalty-free.",
  licenseTermsHeading: "What is not allowed",
  licenseTermsBody:
    "Without my written permission the images may not be downloaded, copied, republished, altered, cropped or resold, whether for profit or free of charge. Social networks, blogs, the press, advertising material and the training of artificial-intelligence models all count as publication.",
  licenseAcquireHeading: "How to obtain a licence",
  licenseAcquireBody:
    "The photographs can be licensed, case by case. Write to me saying which one you are interested in — a link to its page is enough — where you would like to publish it and for how long, and I will come back to you with the terms and a price.",
  licenseCreditHeading: "Credit",
  licenseCreditBody:
    "Every authorised use must carry the line “© Daniele Bartorilla”, next to the image or in the photo credits.",

  photoOverline: "Photograph",
  photoOpenInGallery: "Open in the gallery",
  photoPrev: "Previous photo",
  photoNext: "Next photo",
  photoFallbackDescription: "Wildlife photography by Daniele Bartorilla",
  exifTaken: "Taken on",
  exifCamera: "Camera",
  exifLens: "Lens",
  exifFocal: "Focal length",
  exifAperture: "Aperture",
  exifExposure: "Shutter speed",
  exifIso: "ISO",
  placeLabel: "Taken in",
  placeCountry: "Italy",
  placeMapAria: region => `${region} highlighted on the map of Italy`,
  pinAria: "Where the photo was taken",
  jobTitle: "Wildlife photographer",
  titleWithDate: (title, date) => `${title}, ${date}`,
  titleWithTime: (title, date, time) => `${title}, ${date} at ${time}`,
  titleWithIndex: (title, position, total) => `${title} (${position} of ${total})`,
};

const STRINGS = { it: IT, en: EN };

export const strings = lang => STRINGS[lang] ?? STRINGS[DEFAULT_LANG];

// Dates are the one thing not spelled out per language: both locales want the
// same "day month year" order, so Intl handles it from the tag alone
export const formatDate = (iso, lang) =>
  new Date(iso).toLocaleDateString(strings(lang).dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
