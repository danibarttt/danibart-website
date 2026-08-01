import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  memo,
  startTransition,
} from "react";
import Lightbox, {ImageSlide} from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {Link, useNavigate, useLocation} from "react-router";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import photos from "./photos";
import {HERO_LARGE_QUERY, resolveHeroes} from "./hero.mjs";
import {photoDescription, photoPath, photoTitle} from "./i18n.mjs";
import {useLang} from "./lang";
import {collectSpecies, commonName, speciesSlug, splitSpecies} from "./species.mjs";
import {findRegion} from "./regions.mjs";
import {LangToggle, ThemeToggle} from "./Toggles";
import "./lightbox.css";

// Drop a src/profile.jpg (or .jpeg/.png) in the repo and it shows up automatically
const profileImages = import.meta.glob("./profile.{jpg,jpeg,png}", {
  eager: true,
  import: "default",
});
const profileSrc = Object.values(profileImages)[0];

// Plain anchors would clash with the hash router, so scroll programmatically
const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({behavior: "smooth"});

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      {threshold: 0.15},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, shown];
}

// Which photo backs the hero at which viewport lives in src/hero.mjs: the
// preload tags in generate-static-pages.mjs and the renditions built by
// generate-photos.js have to agree with this exactly, breakpoint included.
const {small: heroSmallPhoto, large: heroLargePhoto} = resolveHeroes(photos);

function useHeroPhoto() {
  const [isLarge, setIsLarge] = useState(
    () => window.matchMedia(HERO_LARGE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(HERO_LARGE_QUERY);
    const onChange = (e) => setIsLarge(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLarge ? heroLargePhoto : heroSmallPhoto;
}

// Masonry columns are laid out in JS rather than CSS column-count: CSS columns
// fill column-major (all of column 1, then column 2, ...), which would put the
// newest photos (gallery order is shooting date, most recent first) all in
// the first column instead of spread across the top row.
// The breakpoint must match the .gallery-column width rule in index.css.
const GALLERY_TWO_COL_QUERY = "(max-width: 1000px)";

function useGalleryColumnCount() {
  const [count, setCount] = useState(
    () => (window.matchMedia(GALLERY_TWO_COL_QUERY).matches ? 2 : 3),
  );

  useEffect(() => {
    const mql = window.matchMedia(GALLERY_TWO_COL_QUERY);
    const onChange = (e) => setCount(e.matches ? 2 : 3);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return count;
}

// The set of species is language-independent; only the order the chips are
// listed in is not, since it follows the common name. The slug map is built
// from the Italian one either way — that is what ?specie= carries.
const allSpecies = collectSpecies(photos);
const speciesBySlug = new Map(allSpecies.map((s) => [speciesSlug(s), s]));
const speciesOrder = {it: allSpecies, en: collectSpecies(photos, "en")};

// EXIF DateTimeOriginal carries no timezone, so exif-reader hands back a Date
// built as if it were UTC. Reading it back with the UTC accessors returns the
// wall-clock time the camera recorded; the local ones would shift it by the
// viewer's offset, which for a shot near midnight moves it into another day.
const photoYear = (photo) =>
  photo.dateTaken ? new Date(photo.dateTaken).getUTCFullYear() : null;

// Shooting years present in the manifest, most recent first. Undated photos
// (no EXIF) are unreachable through this filter, same as they sort last in
// the gallery — the chip row only offers years that actually have photos.
const allYears = Array.from(
  new Set(photos.map(photoYear).filter(Boolean)),
).sort((a, b) => b - a);

// Chip row above the gallery grid to filter by species (shown by common name;
// filtering itself still matches the Latin name stored in photos.json).
// The first chip clears the filter.
function SpeciesFilter({active, onChange}) {
  const {lang, t} = useLang();

  return (
    <div className="species-filter" role="group" aria-label={t.filterSpecies}>
      <button
        className={`species-chip${active === null ? " active" : ""}`}
        onClick={() => onChange(null)}
      >
        {t.filterAll}
      </button>
      {speciesOrder[lang].map((species) => (
        <button
          key={species}
          className={`species-chip${active === species ? " active" : ""}`}
          onClick={() => onChange(active === species ? null : species)}
        >
          {commonName(species, lang)}
        </button>
      ))}
    </div>
  );
}

// Second, narrower chip row: shooting year. Combines with the species filter
// (both must match). Hidden when every photo was shot in the same year, where
// the row would be a single chip that filters nothing.
function YearFilter({active, onChange}) {
  const {t} = useLang();
  if (allYears.length < 2) return null;

  return (
    <div
      className="species-filter year-filter"
      role="group"
      aria-label={t.filterYear}
    >
      <button
        className={`species-chip${active === null ? " active" : ""}`}
        onClick={() => onChange(null)}
      >
        {t.filterAnyYear}
      </button>
      {allYears.map((year) => (
        <button
          key={year}
          className={`species-chip${active === year ? " active" : ""}`}
          onClick={() => onChange(active === year ? null : year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

function distributeIntoColumns(items, columnCount) {
  // Greedy shortest-column packing (as in Pinterest-style masonry libraries):
  // each photo goes to whichever column has the least accumulated height so
  // far, estimated from its aspect ratio. Plain round-robin (by index) only
  // balances item counts, not heights, so a run of tall portrait photos in
  // one column left it visibly longer than the others.
  const columns = Array.from({length: columnCount}, () => []);
  const heights = Array(columnCount).fill(0);
  items.forEach((photo, index) => {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push({photo, index});
    heights[shortest] += (photo.height && photo.width) ? photo.height / photo.width : 1;
  });
  return columns;
}

const scrollToTop = () => window.scrollTo({top: 0, behavior: "smooth"});

// Where the gallery was when it was last left. Every route away from "/"
// unmounts Gallery, and coming back — through "Torna alla galleria", the
// browser's back button, or a card in the previews section — would otherwise
// drop the visitor at the hero, with the photos they were looking at somewhere
// far below. Module scope rather than sessionStorage on purpose: this is a
// "back" affordance within one run of the SPA, and a fresh load of "/" should
// start at the top. The photo boxes are sized from their width/height
// attributes, so the document is already its full height at mount and the
// position is reachable before a single thumbnail has loaded.
let lastGalleryScroll = 0;

// The nav mixes in-page sections (scrolled to) with routes (navigated to);
// shared by the hero nav, the sticky nav and the mobile drawer so the three
// never drift apart. onDone lets the drawer close itself first — the scroll
// is deferred one tick so the close re-render releases the body scroll lock
// before scrollIntoView runs.
function NavLinks({onDone}) {
  const navigate = useNavigate();
  const {t} = useLang();

  const toSection = (id) => {
    onDone?.();
    setTimeout(() => scrollTo(id), 0);
  };

  const toRoute = (path) => {
    onDone?.();
    navigate(path);
  };

  return (
    <>
      <button onClick={() => toSection("galleria")}>{t.navGallery}</button>
      <button onClick={() => toRoute("/specie")}>{t.navSpecies}</button>
      <button onClick={() => toRoute("/numeri")}>{t.navNumbers}</button>
      <button onClick={() => toSection("chi-sono")}>{t.navAbout}</button>
      <button onClick={() => toSection("contatti")}>{t.navContact}</button>
    </>
  );
}

// On mobile the nav links collapse into this hamburger, which opens the NavDrawer
function BurgerButton({onClick}) {
  const {t} = useLang();

  return (
    <button className="nav-burger" onClick={onClick} aria-label={t.menuOpen}>
      <span/>
      <span/>
      <span/>
    </button>
  );
}

// Mobile-only side drawer with the nav actions, opened by either nav's hamburger
function NavDrawer({open, onClose}) {
  const {t} = useLang();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div className={`nav-drawer-root${open ? " open" : ""}`} inert={!open}>
      <div className="nav-drawer-backdrop" onClick={onClose}/>
      <aside
        className="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t.menuLabel}
      >
        <button
          className="nav-drawer-close"
          onClick={onClose}
          aria-label={t.menuClose}
        >
          ×
        </button>
        <div className="nav-drawer-links">
          <NavLinks onDone={onClose}/>
        </div>
        {/* Below 820px the nav links collapse into this drawer, and the two
            preference toggles come with them — there is no room in the bar */}
        <div className="nav-drawer-theme">
          <ThemeToggle label/>
          <LangToggle label/>
        </div>
      </aside>
    </div>
  );
}

// Frosted-glass nav + back-to-top button, both appear once the hero is scrolled past
function StickyNav({onMenuOpen}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, {passive: true});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav className={`sticky-nav${shown ? " shown" : ""}`} inert={!shown}>
        <button className="sticky-brand" onClick={scrollToTop}>
          Daniele Bartorilla
        </button>
        <div className="nav-links">
          <NavLinks/>
        </div>
        <div className="nav-actions">
          <LangToggle/>
          <ThemeToggle/>
          <BurgerButton onClick={onMenuOpen}/>
        </div>
      </nav>
    </>
  );
}

function Hero({onMenuOpen}) {
  const {t} = useLang();
  const heroPhoto = useHeroPhoto();
  const [visible, setVisible] = useState(false);
  // Tracks which photo has loaded, so crossing the breakpoint fades the
  // incoming background in instead of inheriting the previous one's state
  const [loadedId, setLoadedId] = useState(null);
  const bgLoaded = loadedId === heroPhoto.id;
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className="hero">
      {/* Inline blur placeholder shows instantly while the real background loads */}
      <img
        className="hero-bg hero-bg-placeholder"
        src={heroPhoto.blur ?? heroPhoto.thumbnail}
        alt=""
        aria-hidden="true"
      />
      {/* AVIF first, webp next: the preload injected by generate-static-pages.mjs
          carries type="image/avif", so browsers that would skip it here skip
          the preload too and no viewport ends up downloading two heroes */}
      <picture key={heroPhoto.id}>
        {heroPhoto.heroAvif && (
          <source srcSet={heroPhoto.heroAvif} type="image/avif"/>
        )}
        {heroPhoto.heroWebp && (
          <source srcSet={heroPhoto.heroWebp} type="image/webp"/>
        )}
        <img
          className={`hero-bg${bgLoaded ? " loaded" : ""}`}
          src={heroPhoto.heroSrc ?? heroPhoto.src}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onLoad={() => setLoadedId(heroPhoto.id)}
        />
      </picture>
      <div className="hero-overlay"/>
      <div className="hero-grain"/>
      <nav className="nav">
        <div className="nav-links">
          <NavLinks/>
        </div>
        <div className="nav-actions">
          <LangToggle/>
          <ThemeToggle/>
          <BurgerButton onClick={onMenuOpen}/>
        </div>
      </nav>
      <div className={`hero-content${visible ? " visible" : ""}`}>
        <h1>Daniele Bartorilla</h1>
        <p className="overline">{t.tagline}</p>
        <p className="hero-tagline">{t.heroTagline}</p>
      </div>
    </header>
  );
}

// Memoized: the whole Gallery re-renders on every lightbox navigation (the
// URL sync re-renders the route), and 38 items re-rendering per swipe is
// noticeable jank on phones
const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;

const GalleryItem = memo(function GalleryItem({photo, index, onOpen}) {
  const {lang, t} = useLang();
  const [loaded, setLoaded] = useState(false);
  const [ref, shown] = useReveal();
  const isNew = photo.dateTaken && Date.now() - new Date(photo.dateTaken).getTime() < TWENTY_DAYS_MS;
  const title = photoTitle(photo, lang);

  // A real <a href> to the photo's static page rather than a click handler on
  // the figure: it is the only path from the home page to the /p/ pages a
  // crawler can follow (the SPA otherwise opens photos purely in JS), and it
  // makes cmd-click / "open in new tab" work. A plain click is intercepted and
  // still opens the lightbox, so nothing changes for ordinary use.
  const openHere = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onOpen(photo.id);
  };

  return (
    <figure
      ref={ref}
      className={`gallery-item reveal-item${shown ? " shown" : ""}`}
      style={{transitionDelay: `${(index % 3) * 80}ms`}}
    >
      {/* Inline blur-up placeholder, covered by the thumbnail once it loads */}
      <img className="gallery-placeholder" src={photo.blur} alt="" aria-hidden="true"/>
      <picture>
        {photo.thumbnailAvif && (
          <source srcSet={photo.thumbnailAvif} type="image/avif"/>
        )}
        {photo.thumbnailWebp && (
          <source srcSet={photo.thumbnailWebp} type="image/webp"/>
        )}
        <img
          alt={photo.species ? `${title} (${photo.species})` : title}
          src={photo.thumbnail}
          loading="lazy"
          decoding="async"
          width={photo.width}
          height={photo.height}
          className={loaded ? "loaded" : ""}
          onLoad={() => setLoaded(true)}
        />
      </picture>
      {isNew && <span className="gallery-badge-new">{t.galleryNew}</span>}
      <figcaption className="gallery-caption">
        {title}
        {photo.species && (
          <span className="gallery-caption-species">{photo.species}</span>
        )}
      </figcaption>
      <a
        className="gallery-link"
        href={photoPath(photo.id, lang)}
        onClick={openHere}
        aria-label={title}
      />
    </figure>
  );
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Deterministic (not random) so every visitor sees the same photo within a
// given week, and rotates through the whole catalog as it grows over time
function getFeaturedPhoto() {
  const weekIndex = Math.floor(Date.now() / WEEK_MS);
  return photos[weekIndex % photos.length];
}

function Featured({onOpen}) {
  const {lang, t} = useLang();
  const photo = useMemo(getFeaturedPhoto, []);
  const [ref, shown] = useReveal();
  const [loaded, setLoaded] = useState(false);
  // The 1280px lightbox rendition is plenty for a banner this size, and
  // already generated — no need for the multi-MB fullsize photo
  const bannerSrc = photo.srcSet[0]?.src ?? photo.src;
  const title = photoTitle(photo, lang);
  const description = photoDescription(photo, lang);

  return (
    <section
      ref={ref}
      className={`section featured reveal${shown ? " shown" : ""}`}
    >
      <div className="section-header">
        <p className="overline">{t.featuredOverline}</p>
        <h2 className="section-title">{t.featuredTitle}</h2>
      </div>
      <div
        className="featured-card"
        onClick={() => onOpen(photo.id)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(photo.id)}
        tabIndex={0}
        role="button"
        aria-label={t.featuredOpen(title)}
      >
        <img className="featured-placeholder" src={photo.blur} alt="" aria-hidden="true"/>
        <img
          className={`featured-img${loaded ? " loaded" : ""}`}
          src={bannerSrc}
          alt={photo.species ? `${title} (${photo.species})` : title}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
        <div className="featured-overlay"/>
        <div className="featured-text">
          <span className="featured-title">{title}</span>
          {photo.species && <span className="featured-species">{photo.species}</span>}
          {description && <span className="featured-desc">{description}</span>}
        </div>
      </div>
    </section>
  );
}

/* ---------- Sub-page teasers ---------- */

// /specie and /numeri hang off the nav alone, which on the home page is either
// scrolled past or folded into the hamburger. These two cards sit where the
// gallery ends — the point where a visitor is done scrolling photos and might
// want another way through them — and each shows enough of its page to say
// what is on the other side of the link.

const PREVIEW_COVERS = 5;

// The most photographed species first, each with its most recent shot (photos
// is already ordered by shooting date). Language-independent: which species
// come out on top is a property of the manifest, and only their names change.
const previewCovers = allSpecies
  .map((latin) => ({
    latin,
    taken: photos.filter(
      (photo) => photo.species && splitSpecies(photo.species).includes(latin),
    ),
  }))
  .sort((a, b) => b.taken.length - a.taken.length)
  .slice(0, PREVIEW_COVERS)
  .map(({latin, taken}) => ({latin, cover: taken[0]}));

// Places counted the way /numeri groups them: anything findRegion resolves
// collapses into its region, and a position it does not know stands for itself
const previewPlaceCount = new Set(
  photos
    .map((photo) => photo.position?.trim())
    .filter(Boolean)
    .map((position) => findRegion(position) ?? position),
).size;

// The last twelve months as a bare sparkline: the shape of the months chart on
// /numeri with its axis and labels taken off. UTC accessors throughout, as
// everywhere the EXIF date is read (see photoYear above).
const SPARK_MONTHS = 12;

const previewSpark = (() => {
  const dates = photos
    .map((photo) => photo.dateTaken && new Date(photo.dateTaken))
    .filter(Boolean);
  if (dates.length === 0) return [];

  const counts = new Map();
  for (const date of dates) {
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const last = new Date(Math.max(...dates.map((date) => date.getTime())));
  return Array.from({length: SPARK_MONTHS}, (_, index) => {
    const month = new Date(
      Date.UTC(
        last.getUTCFullYear(),
        last.getUTCMonth() - (SPARK_MONTHS - 1 - index),
        1,
      ),
    );
    return counts.get(`${month.getUTCFullYear()}-${month.getUTCMonth()}`) ?? 0;
  });
})();

const previewSparkMax = Math.max(...previewSpark, 1);

function Previews() {
  const {t} = useLang();
  const [ref, shown] = useReveal();

  return (
    <section ref={ref} className={`section previews reveal${shown ? " shown" : ""}`}>
      <div className="preview-grid">
        <Link className="preview-card" to="/specie">
          <p className="overline">{t.previewSpeciesOverline}</p>
          <h2 className="preview-title">{t.previewSpeciesTitle}</h2>
          <p className="preview-sub">{t.previewSpeciesSub}</p>
          {/* Decorative: the covers stand for the index, and the card's own
              text already names what the link leads to */}
          <div className="preview-thumbs" aria-hidden="true">
            {previewCovers.map(({latin, cover}) => (
              <picture key={latin}>
                {cover.thumbnailAvif && (
                  <source srcSet={cover.thumbnailAvif} type="image/avif"/>
                )}
                {cover.thumbnailWebp && (
                  <source srcSet={cover.thumbnailWebp} type="image/webp"/>
                )}
                <img src={cover.thumbnail} alt="" loading="lazy" decoding="async"/>
              </picture>
            ))}
          </div>
          <span className="preview-cta">{t.previewSpeciesCta}</span>
        </Link>

        <Link className="preview-card" to="/numeri">
          <p className="overline">{t.previewStatsOverline}</p>
          <h2 className="preview-title">{t.previewStatsTitle}</h2>
          <p className="preview-sub">{t.previewStatsSub}</p>
          <div className="preview-figures">
            <span className="preview-figure">
              <b>{photos.length}</b>
              {t.previewStatShots}
            </span>
            <span className="preview-figure">
              <b>{allSpecies.length}</b>
              {t.previewStatSpecies}
            </span>
            {previewPlaceCount > 0 && (
              <span className="preview-figure">
                <b>{previewPlaceCount}</b>
                {t.previewStatPlaces(previewPlaceCount)}
              </span>
            )}
          </div>
          {previewSpark.length > 0 && (
            <div className="preview-spark" aria-hidden="true">
              {previewSpark.map((value, index) => (
                <span
                  key={index}
                  /* A month with no shots gets no mark at all, as on the
                     charts: a sliver would read as a small count, not as none.
                     The floor keeps a single shot visible. */
                  style={{
                    height: value
                      ? `${Math.max((value / previewSparkMax) * 100, 8)}%`
                      : 0,
                  }}
                />
              ))}
            </div>
          )}
          <span className="preview-cta">{t.previewStatsCta}</span>
        </Link>
      </div>
    </section>
  );
}

function About() {
  const {t} = useLang();
  const [ref, shown] = useReveal();

  return (
    <section
      id="chi-sono"
      ref={ref}
      className={`section about reveal${shown ? " shown" : ""}`}
    >
      <div className="about-photo">
        {profileSrc ? (
          <img src={profileSrc} alt={t.aboutPortrait}/>
        ) : (
          <div className="about-placeholder">DB</div>
        )}
      </div>
      <div className="about-text">
        <p className="overline">{t.aboutOverline}</p>
        <h2 className="section-title">{t.aboutTitle}</h2>
        <p>{t.aboutP1}</p>
        <p>{t.aboutP2}</p>
      </div>
    </section>
  );
}

function Contacts() {
  const {t} = useLang();
  const [ref, shown] = useReveal();

  return (
    <section
      id="contatti"
      ref={ref}
      className={`section contacts reveal${shown ? " shown" : ""}`}
    >
      <div className="section-header">
        <p className="overline">{t.contactsOverline}</p>
        <h2 className="section-title">{t.contactsTitle}</h2>
        <p className="section-sub">{t.contactsSub}</p>
      </div>
      <a
        className="contacts-email"
        href="mailto:danielebartorilla@gmail.com"
      >
        danielebartorilla@gmail.com
      </a>
    </section>
  );
}

// The slides array's identity must stay stable across swipes: the lightbox
// resets its internal state (cutting the swipe animation short) whenever it
// receives a new array, and Gallery re-renders on every swipe to sync the
// ?photo= URL param. The mapping lives at module scope and the array is
// memoized on the filtered photo list, so a new identity is produced only
// when the filters actually change — never mid-swipe.
const toSlide = (photo) => ({
  src: photo.src,
  // Downscaled renditions: phones fetch ~1280px instead of the multi-MB
  // full-resolution photo, which took seconds per swipe on cellular
  srcSet: photo.srcSet,
  // width/height also feed the Zoom plugin's max-zoom computation
  width: photo.width,
  height: photo.height,
  // The webp variant is what the gallery <picture> already
  // downloaded, so the filmstrip and blur-up hit the browser cache
  thumbnail: photo.thumbnailWebp ?? photo.thumbnail,
  blur: photo.blur,
});

// Fullscreen ambient backdrop for the lightbox: the current photo's tiny
// blur placeholder stretched under a dark overlay, crossfading on navigation.
// The base64 placeholder is used (not the 600px thumbnail) so each swipe
// composites a cheap 24px source instead of decoding + blurring a real image.
function LightboxBackdrop({photo}) {
  const [layers, setLayers] = useState(photo ? [photo] : []);
  const wasShown = useRef(false);

  useEffect(() => {
    if (photo) {
      setLayers((prev) => {
        if (!wasShown.current) return [photo];
        if (prev[prev.length - 1]?.id === photo.id) return prev;
        // Keep the outgoing layer so the incoming one can fade in over it
        return [...prev.slice(-1), photo];
      });
      wasShown.current = true;
    } else {
      wasShown.current = false;
    }
  }, [photo]);

  // Once the incoming layer's fade-in finishes, drop the outgoing one so
  // only a single fullscreen blurred layer stays composited between swipes
  const prune = (id) =>
    setLayers((prev) =>
      prev.length > 1 && prev[prev.length - 1].id === id
        ? prev.slice(-1)
        : prev,
    );

  return (
    <div
      className={`lightbox-backdrop${photo ? " shown" : ""}`}
      aria-hidden="true"
    >
      {layers.map((p) => (
        <img
          key={p.id}
          src={p.blur ?? p.thumbnailWebp ?? p.thumbnail}
          alt=""
          onAnimationEnd={() => prune(p.id)}
        />
      ))}
    </div>
  );
}

// Blur-up for the lightbox: while the fullsize photo downloads, show the
// thumbnail hyper-blurred (stacked over the inline base64 placeholder, which
// paints instantly), then fade it out once the real image is in
function BlurUpSlide({slide, offset, rect, onClick}) {
  const [loaded, setLoaded] = useState(false);
  // Unmount the blurred layers once faded out: leaving them at opacity 0
  // keeps a fullscreen filtered layer alive per mounted slide, which drags
  // down the swipe and zoom animations
  const [blurGone, setBlurGone] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => setBlurGone(true), 450); // fade lasts 400ms
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <>
      {!blurGone && (
        <div
          className={`slide-blur-up${loaded ? " hidden" : ""}`}
          aria-hidden="true"
        >
          {slide.blur && <img src={slide.blur} alt=""/>}
          <img src={slide.thumbnail} alt=""/>
        </div>
      )}
      <ImageSlide
        slide={slide}
        offset={offset}
        rect={rect}
        onClick={onClick}
        onLoad={() => setLoaded(true)}
        // Never let a still-decoding neighbor image block the swipe's paint
        imageProps={{decoding: "async"}}
      />
    </>
  );
}

export default function Gallery() {
  const {lang, t} = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPhotoId, setCurrentPhotoId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareToast, setShareToast] = useState(null);
  const shareToastTimer = useRef(null);
  const galleryColumnCount = useGalleryColumnCount();

  // The two filters live in the query string rather than in state: it makes a
  // filtered view linkable (the species index points straight at one) and
  // leaves a single source of truth, so there is no state/URL sync to keep.
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const activeSpecies = speciesBySlug.get(params.get("specie")) ?? null;
  const yearParam = Number(params.get("anno"));
  const activeYear = allYears.includes(yearParam) ? yearParam : null;

  const filteredPhotos = useMemo(
    () =>
      photos.filter(
        (p) =>
          (!activeSpecies ||
            (p.species && splitSpecies(p.species).includes(activeSpecies))) &&
          (!activeYear || photoYear(p) === activeYear),
      ),
    [activeSpecies, activeYear],
  );
  const galleryColumns = useMemo(
    () => distributeIntoColumns(filteredPhotos, galleryColumnCount),
    [galleryColumnCount, filteredPhotos],
  );
  const galleryCountLabel = useMemo(() => {
    if (!activeSpecies && !activeYear) return t.galleryCountAll(photos.length);
    return t.galleryCount(
      filteredPhotos.length,
      activeSpecies && commonName(activeSpecies, lang),
      activeYear,
    );
  }, [activeSpecies, activeYear, filteredPhotos.length, lang, t]);

  // Landing on the gallery with a filter already applied means the visitor
  // asked for a *filtered gallery* — from a card on /specie, from a bar on
  // /numeri, or from a shared link — so the hero is not what they came to see.
  // Read once, at mount: changing a filter with the chips re-renders but does
  // not remount, so this can never yank the page while someone is reading it.
  // A ?photo= link is excluded — there the lightbox is the subject, and the
  // page behind it is not worth moving.
  const enteredFiltered = useRef(
    Boolean((activeSpecies || activeYear) && !params.get("photo")),
  );

  useEffect(() => {
    if (enteredFiltered.current) scrollTo("galleria");
  }, []);

  // Restored before paint, so the page never flashes at the top first.
  // "instant" is explicit because html carries scroll-behavior: smooth, which
  // would otherwise animate the whole way down. A filtered entry wins: there
  // the visitor asked for the gallery, not for wherever they had been.
  useLayoutEffect(() => {
    if (!enteredFiltered.current && lastGalleryScroll > 0) {
      window.scrollTo({top: lastGalleryScroll, behavior: "instant"});
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      lastGalleryScroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, {passive: true});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => () => clearTimeout(shareToastTimer.current), []);

  // Stable identity: a new render function each Gallery render (which happens
  // per swipe for the URL sync) would make yarl re-render every mounted slide
  const renderLightbox = useMemo(
    () => ({
      slide: ({slide, offset, rect}) => (
        <BlurUpSlide slide={slide} offset={offset} rect={rect}/>
      ),
      // Drops the Zoom plugin's +/- toolbar buttons without dropping the
      // plugin: pinch, double-tap, wheel and the arrow keys still zoom
      buttonZoom: () => null,
    }),
    [],
  );

  const showShareToast = (message) => {
    setShareToast(message);
    clearTimeout(shareToastTimer.current);
    shareToastTimer.current = setTimeout(() => setShareToast(null), 2400);
  };

  const sharePhoto = async (photo) => {
    // The /p/<id>/ page is the photo's own page, with Open Graph tags, so a
    // shared link unfurls with the photo on WhatsApp & co. It is built by
    // generate-static-pages.mjs — in dev the static-pages-dev plugin serves
    // the same page off the dev server, so there is one URL everywhere.
    const url = `${window.location.origin}${photoPath(photo.id, lang)}`;
    if (navigator.share) {
      try {
        await navigator.share({title: photoTitle(photo, lang), url});
      } catch {
        // sharing canceled
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showShareToast(t.lightboxLinkCopied);
    } catch {
      showShareToast(t.lightboxCopyFailed);
    }
  };

  // The HQ button lands on the photo's own /p/ page, which shows the shot at
  // full resolution (in dev too — see the static-pages-dev plugin)
  const openHighDefinition = (photo) => {
    window.location.href = photoPath(photo.id, lang);
  };

  // Stable identity so the memoized GalleryItems skip the per-swipe re-renders.
  // It has to read the live query string (to keep the active filters in the
  // URL), which changes on every swipe — hence a ref rather than a dependency,
  // which would give the callback a new identity per swipe and re-render all
  // 32 items.
  const locationRef = useRef(location);
  locationRef.current = location;

  const navigateWithParams = useCallback(
    (updates, options) => {
      const {pathname, search} = locationRef.current;
      const next = new URLSearchParams(search);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      navigate(pathname + (query ? `?${query}` : ""), options);
    },
    [navigate],
  );

  const openLightbox = useCallback(
    (id) => navigateWithParams({photo: id}, {replace: false}),
    [navigateWithParams],
  );

  // replace: true so a run through the filter chips does not fill the back
  // button with every intermediate selection
  const setActiveSpecies = useCallback(
    (species) =>
      navigateWithParams(
        {specie: species && speciesSlug(species)},
        {replace: true},
      ),
    [navigateWithParams],
  );

  const setActiveYear = useCallback(
    (year) => navigateWithParams({anno: year}, {replace: true}),
    [navigateWithParams],
  );

  const closeLightbox = () => {
    if (new URLSearchParams(location.search).get("photo")) {
      navigateWithParams({photo: null}, {replace: true});
    }
    setCurrentPhotoId(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setCurrentPhotoId(params.get("photo"));
  }, [location.search]);

  // The lightbox walks the filtered set, so arrowing out of a "Gruccione"
  // filter cannot land on a heron. A deep link to a photo the filters exclude
  // (a shared /p/ link opened while a filter is set) falls back to the full
  // list rather than showing nothing. Both branches return an existing array
  // reference, so the identity stays stable while swiping.
  const lightboxPhotos = useMemo(() => {
    if (!currentPhotoId) return filteredPhotos;
    return filteredPhotos.some((p) => p.id === currentPhotoId)
      ? filteredPhotos
      : photos;
  }, [filteredPhotos, currentPhotoId]);

  const lightboxSlides = useMemo(
    () => lightboxPhotos.map(toSlide),
    [lightboxPhotos],
  );

  const currentIndex = lightboxPhotos.findIndex((p) => p.id === currentPhotoId);

  return (
    <div>
      <Hero onMenuOpen={() => setMenuOpen(true)}/>
      <StickyNav onMenuOpen={() => setMenuOpen(true)}/>
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)}/>

      <Featured onOpen={openLightbox}/>

      <section id="galleria" className="section">
        <div className="section-header">
          <p className="overline">{t.galleryOverline}</p>
          <h2 className="section-title">{t.galleryTitle}</h2>
          <p className="section-sub">{galleryCountLabel}</p>
        </div>
        <SpeciesFilter active={activeSpecies} onChange={setActiveSpecies}/>
        <YearFilter active={activeYear} onChange={setActiveYear}/>
        {filteredPhotos.length === 0 ? (
          <p className="gallery-empty">
            {t.galleryEmpty}{" "}
            <button
              onClick={() => {
                setActiveSpecies(null);
                setActiveYear(null);
              }}
            >
              {t.galleryShowAll}
            </button>
          </p>
        ) : (
          <div className="gallery-grid">
            {galleryColumns.map((column, columnIndex) => (
              <div className="gallery-column" key={columnIndex}>
                {column.map(({photo, index}) => (
                  <GalleryItem
                    key={photo.id}
                    photo={photo}
                    index={index}
                    onOpen={openLightbox}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <Previews/>

      <About/>

      <Contacts/>

      <LightboxBackdrop
        photo={currentIndex >= 0 ? lightboxPhotos[currentIndex] : null}
      />

      <div className={`share-toast${shareToast ? " shown" : ""}`} role="status">
        {shareToast}
      </div>

      {currentIndex >= 0 && (
        <Lightbox
          slides={lightboxSlides}
          // 1 per side only gives the next photo a single swipe's worth of
          // head start to download before it's needed — too little on a
          // slow connection or when flicking through several photos in a
          // row, which shows as the blur-up placeholder still lingering.
          // 2 per side doubles that head start at the cost of 2 more
          // in-flight fullsize downloads.
          carousel={{preload: 2}}
          render={renderLightbox}
          plugins={[Zoom, Thumbnails, Slideshow]}
          open={true}
          close={closeLightbox}
          index={currentIndex}
          animation={{fade: 400, swipe: 450, navigation: 300}}
          // Only the close button (and browser/hash back) should close the
          // lightbox — pull gestures and backdrop clicks are easy to trigger
          // by accident (e.g. pinch-to-zoom misread as a pull-down drag)
          controller={{
            closeOnBackdropClick: false,
            closeOnPullDown: false,
            closeOnPullUp: false,
            closeOnEscape: false,
          }}
          // The Slideshow plugin replaces the "slideshow" placeholder in place;
          // without it in the array its button would be prepended, landing on
          // the wrong side of the toolbar
          toolbar={{
            buttons: [
              // Worded rather than an icon: it is the one control that leaves
              // the lightbox, and no glyph said so. The arrow carries the
              // "opens another page" part.
              <button
                key="hq"
                type="button"
                className="yarl__button lightbox-details"
                title={t.lightboxDetailsTitle}
                aria-label={t.lightboxDetailsAria}
                onClick={() => openHighDefinition(lightboxPhotos[currentIndex])}
              >
                <span>{t.lightboxDetails}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6.5 17.5 17.5 6.5M9.5 6.5h8v8"/>
                </svg>
              </button>,
              "slideshow",
              <button
                key="share"
                type="button"
                className="yarl__button"
                title={t.lightboxShare}
                aria-label={t.lightboxShareAria}
                onClick={() => sharePhoto(lightboxPhotos[currentIndex])}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >
                  <circle cx="6" cy="12" r="2.6"/>
                  <circle cx="17.5" cy="5.5" r="2.6"/>
                  <circle cx="17.5" cy="18.5" r="2.6"/>
                  <path d="M8.4 10.9l6.7-4M8.4 13.1l6.7 4"/>
                </svg>
              </button>,
              "close",
            ],
          }}
          thumbnails={{
            width: 96,
            height: 64,
            gap: 10,
            padding: 0,
            imageFit: "cover",
            vignette: false,
          }}
          // 5s per photo: long enough to actually look at one, short enough
          // that the whole catalog is not an evening's commitment
          slideshow={{autoplay: false, delay: 5000}}
          // yarl ships its own English labels, which are neither the wording
          // used here nor any use at all on the Italian site
          labels={{
            Previous: t.lightboxPrevious,
            Next: t.lightboxNext,
            Close: t.lightboxClose,
            Play: t.lightboxPlay,
            Pause: t.lightboxPause,
          }}
          on={{
            view: ({index}) => {
              const nextId = lightboxPhotos[index].id;
              setCurrentPhotoId(nextId);
              // Low-priority URL sync: the router re-render must not compete
              // with the swipe animation for main-thread time
              startTransition(() => {
                navigateWithParams({photo: nextId}, {replace: true});
              });
            },
          }}
        />
      )}
    </div>
  );
}
