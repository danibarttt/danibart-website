import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
  startTransition,
} from "react";
import Lightbox, {ImageSlide} from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {useNavigate, useLocation} from "react-router";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/plugins/counter.css";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import photos from "./photos";
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

// Two hero photos may be designated in photos.json: heroSmall (narrow
// viewports) and heroLarge (wide viewports, where object-fit: cover crops
// tall photos the most). A plain hero: true photo backs both as fallback.
// The breakpoint must match the preload media queries in generate-social-pages.mjs.
const HERO_LARGE_QUERY = "(min-width: 1024px)";
const heroFallback = photos.find((p) => p.hero) ?? photos[0];
const heroSmallPhoto = photos.find((p) => p.heroSmall) ?? heroFallback;
const heroLargePhoto = photos.find((p) => p.heroLarge) ?? heroFallback;

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

// Some entries list more than one species ("Egretta garzetta · Threskiornis
// aethiopicus"), separated by "·" — split so each name filters independently
const splitSpecies = (species) => species.split("·").map((s) => s.trim());

// Filtering still keys off the Latin name (it's what photos.json carries),
// but the chips show the Italian common name — this maps between the two.
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

const allSpecies = Array.from(
  new Set(photos.flatMap((p) => (p.species ? splitSpecies(p.species) : []))),
).sort((a, b) =>
  (SPECIES_IT[a] ?? a).localeCompare(SPECIES_IT[b] ?? b),
);

// Chip row above the gallery grid to filter by species (Italian common name;
// filtering itself still matches the Latin name stored in photos.json).
// "Tutte" clears the filter.
function SpeciesFilter({active, onChange}) {
  return (
    <div className="species-filter" role="group" aria-label="Filtra per specie">
      <button
        className={`species-chip${active === null ? " active" : ""}`}
        onClick={() => onChange(null)}
      >
        Tutte
      </button>
      {allSpecies.map((species) => (
        <button
          key={species}
          className={`species-chip${active === species ? " active" : ""}`}
          onClick={() => onChange(active === species ? null : species)}
        >
          {SPECIES_IT[species] ?? species}
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

// On mobile the nav links collapse into this hamburger, which opens the NavDrawer
function BurgerButton({onClick}) {
  return (
    <button className="nav-burger" onClick={onClick} aria-label="Apri il menu">
      <span/>
      <span/>
      <span/>
    </button>
  );
}

// Mobile-only side drawer with the nav actions, opened by either nav's hamburger
function NavDrawer({open, onClose}) {
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

  // Defer the scroll one tick so the close re-render releases the body
  // scroll lock first, otherwise scrollIntoView cannot move the page
  const go = (id) => {
    onClose();
    setTimeout(() => scrollTo(id), 0);
  };

  return (
    <div className={`nav-drawer-root${open ? " open" : ""}`} inert={!open}>
      <div className="nav-drawer-backdrop" onClick={onClose}/>
      <aside
        className="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu di navigazione"
      >
        <button
          className="nav-drawer-close"
          onClick={onClose}
          aria-label="Chiudi il menu"
        >
          ×
        </button>
        <div className="nav-drawer-links">
          <button onClick={() => go("galleria")}>Galleria</button>
          <button onClick={() => go("chi-sono")}>Chi sono</button>
          <button onClick={() => go("contatti")}>Contatti</button>
        </div>
      </aside>
    </div>
  );
}

// Frosted-glass nav + back-to-top button, both appear once the hero is scrolled past
function StickyNav({onMenuOpen}) {
  const [shown, setShown] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setShown(window.scrollY > window.innerHeight * 0.75);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
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
          <button onClick={() => scrollTo("galleria")}>Galleria</button>
          <button onClick={() => scrollTo("chi-sono")}>Chi sono</button>
          <button onClick={() => scrollTo("contatti")}>Contatti</button>
        </div>
        <BurgerButton onClick={onMenuOpen}/>
        <div
          className="nav-progress"
          style={{transform: `scaleX(${progress})`}}
        />
      </nav>
    </>
  );
}

function Hero({onMenuOpen}) {
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
      <picture key={heroPhoto.id}>
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
          <button onClick={() => scrollTo("galleria")}>Galleria</button>
          <button onClick={() => scrollTo("chi-sono")}>Chi sono</button>
          <button onClick={() => scrollTo("contatti")}>Contatti</button>
        </div>
        <BurgerButton onClick={onMenuOpen}/>
      </nav>
      <div className={`hero-content${visible ? " visible" : ""}`}>
        <h1>Daniele Bartorilla</h1>
        <p className="overline">Fotografia naturalistica</p>
        <p className="hero-tagline">
          Aironi, cormorani e gli altri abitanti delle zone umide, raccontati
          attraverso l'obiettivo.
        </p>
      </div>
    </header>
  );
}

// Memoized: the whole Gallery re-renders on every lightbox navigation (the
// URL sync re-renders the route), and 38 items re-rendering per swipe is
// noticeable jank on phones
const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;

const GalleryItem = memo(function GalleryItem({photo, index, onOpen}) {
  const [loaded, setLoaded] = useState(false);
  const [ref, shown] = useReveal();
  const isNew = photo.dateTaken && Date.now() - new Date(photo.dateTaken).getTime() < TWENTY_DAYS_MS;

  return (
    <figure
      ref={ref}
      className={`gallery-item reveal-item${shown ? " shown" : ""}`}
      style={{transitionDelay: `${(index % 3) * 80}ms`}}
      onClick={() => onOpen(photo.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(photo.id)}
      tabIndex={0}
      role="button"
      aria-label={photo.title}
    >
      {/* Inline blur-up placeholder, covered by the thumbnail once it loads */}
      <img className="gallery-placeholder" src={photo.blur} alt="" aria-hidden="true"/>
      <picture>
        {photo.thumbnailWebp && (
          <source srcSet={photo.thumbnailWebp} type="image/webp"/>
        )}
        <img
          alt={photo.species ? `${photo.title} (${photo.species})` : photo.title}
          src={photo.thumbnail}
          loading="lazy"
          decoding="async"
          width={photo.width}
          height={photo.height}
          className={loaded ? "loaded" : ""}
          onLoad={() => setLoaded(true)}
        />
      </picture>
      {isNew && <span className="gallery-badge-new">Nuova</span>}
      <figcaption className="gallery-caption">
        {photo.title}
        {photo.species && (
          <span className="gallery-caption-species">{photo.species}</span>
        )}
      </figcaption>
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
  const photo = useMemo(getFeaturedPhoto, []);
  const [ref, shown] = useReveal();
  const [loaded, setLoaded] = useState(false);
  // The 1280px lightbox rendition is plenty for a banner this size, and
  // already generated — no need for the multi-MB fullsize photo
  const bannerSrc = photo.srcSet[0]?.src ?? photo.src;

  return (
    <section
      ref={ref}
      className={`section featured reveal${shown ? " shown" : ""}`}
    >
      <div className="section-header">
        <p className="overline">Scatto della settimana</p>
        <h2 className="section-title">In evidenza</h2>
      </div>
      <div
        className="featured-card"
        onClick={() => onOpen(photo.id)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(photo.id)}
        tabIndex={0}
        role="button"
        aria-label={`Apri ${photo.title} nella galleria`}
      >
        <img className="featured-placeholder" src={photo.blur} alt="" aria-hidden="true"/>
        <img
          className={`featured-img${loaded ? " loaded" : ""}`}
          src={bannerSrc}
          alt={photo.species ? `${photo.title} (${photo.species})` : photo.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
        <div className="featured-overlay"/>
        <div className="featured-text">
          <span className="featured-title">{photo.title}</span>
          {photo.species && <span className="featured-species">{photo.species}</span>}
          {photo.description && <span className="featured-desc">{photo.description}</span>}
        </div>
      </div>
    </section>
  );
}

function About() {
  const [ref, shown] = useReveal();

  return (
    <section
      id="chi-sono"
      ref={ref}
      className={`section about reveal${shown ? " shown" : ""}`}
    >
      <div className="about-photo">
        {profileSrc ? (
          <img src={profileSrc} alt="Ritratto di Daniele Bartorilla"/>
        ) : (
          <div className="about-placeholder">DB</div>
        )}
      </div>
      <div className="about-text">
        <p className="overline">Chi sono</p>
        <h2 className="section-title">Dietro l'obiettivo</h2>
        <p>
          Mi chiamo Daniele Bartorilla, informatico di professione e fotografo
          naturalista per passione, con una predilezione per gli uccelli delle
          zone umide: aironi, garzette, cormorani e i loro vicini di casa.
        </p>
        <p>
          Scatto principalmente nel Pavese, tra risaie, lanche e garzaie. Mi
          piace fotografare la natura nelle prime ore del mattino o al
          tramonto, quando la luce è più morbida. In questo sito raccolgo le
          foto a cui tengo di più, spero ti piacciano!
        </p>
      </div>
    </section>
  );
}

function Contacts() {
  const [ref, shown] = useReveal();

  return (
    <section
      id="contatti"
      ref={ref}
      className={`section contacts reveal${shown ? " shown" : ""}`}
    >
      <div className="section-header">
        <p className="overline">Contatti</p>
        <h2 className="section-title">Restiamo in contatto</h2>
        <p className="section-sub">
          Vuoi metterti in contatto con me? Scrivimi al seguente indirizzo email:
        </p>
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

const formatExposure = (seconds) =>
  seconds >= 1 ? `${seconds}s` : `1/${Math.round(1 / seconds)}s`;

// Lightbox caption, all in the bottom block: photo title, species name,
// optional description, and the shooting data extracted from EXIF by the
// photo pipeline
function buildCaption(photo) {
  const exif = photo.exif ?? {};
  const exifParts = [
    exif.camera,
    exif.focalLength && `${exif.focalLength}mm`,
    exif.fNumber && `ƒ/${exif.fNumber}`,
    exif.exposureTime && formatExposure(exif.exposureTime),
    exif.iso && `ISO ${exif.iso}`,
  ].filter(Boolean);

  return (
    <>
      <span className="caption-title">{photo.title}</span>
      {photo.species && <span className="caption-species">{photo.species}</span>}
      {photo.description && <span className="caption-text">{photo.description}</span>}
      {exifParts.length > 0 && (
        <span className="caption-exif">{exifParts.join(" · ")}</span>
      )}
    </>
  );
}

// The slides array is hoisted because its identity must be stable: the
// lightbox resets its internal state (cutting the swipe animation short)
// whenever it receives a new slides array, and Gallery re-renders on every
// swipe to sync the ?photo= URL param
const lightboxSlides = photos.map((photo) => ({
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
  description: buildCaption(photo),
}));

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
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPhotoId, setCurrentPhotoId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const captionsRef = useRef(null);
  const [shareToast, setShareToast] = useState(null);
  const shareToastTimer = useRef(null);
  const galleryColumnCount = useGalleryColumnCount();
  const [activeSpecies, setActiveSpecies] = useState(null);
  const filteredPhotos = useMemo(
    () =>
      activeSpecies
        ? photos.filter(
            (p) => p.species && splitSpecies(p.species).includes(activeSpecies),
          )
        : photos,
    [activeSpecies],
  );
  const galleryColumns = useMemo(
    () => distributeIntoColumns(filteredPhotos, galleryColumnCount),
    [galleryColumnCount, filteredPhotos],
  );

  useEffect(() => () => clearTimeout(shareToastTimer.current), []);

  const toggleCaptions = useCallback(() => {
    (captionsRef.current?.visible
      ? captionsRef.current?.hide
      : captionsRef.current?.show)?.();
  }, []);

  // Stable identity: a new render function each Gallery render (which happens
  // per swipe for the URL sync) would make yarl re-render every mounted slide
  const renderLightbox = useMemo(
    () => ({
      slide: ({slide, offset, rect}) => (
        <BlurUpSlide
          slide={slide}
          offset={offset}
          rect={rect}
          onClick={offset === 0 ? toggleCaptions : undefined}
        />
      ),
    }),
    [toggleCaptions],
  );

  const showShareToast = (message) => {
    setShareToast(message);
    clearTimeout(shareToastTimer.current);
    shareToastTimer.current = setTimeout(() => setShareToast(null), 2400);
  };

  const sharePhoto = async (photo) => {
    // The /p/<id>/ pages are static stubs with Open Graph tags (built by
    // generate-social-pages.mjs) that bounce back into the app, so shared
    // links unfurl with the photo on WhatsApp & co. They only exist in the
    // built site, so in dev hand out the SPA deep link instead.
    const url = import.meta.env.DEV
      ? `${window.location.origin}/#/?photo=${photo.id}`
      : `${window.location.origin}/p/${photo.id}/`;
    if (navigator.share) {
      try {
        await navigator.share({title: photo.title, url});
      } catch {
        // sharing canceled
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showShareToast("Link copiato negli appunti");
    } catch {
      showShareToast("Copia del link non riuscita");
    }
  };

  // Stable identity so the memoized GalleryItems skip the per-swipe re-renders
  const openLightbox = useCallback(
    (id) => {
      navigate(`${location.pathname}?photo=${id}`, {replace: false});
    },
    [navigate, location.pathname],
  );

  const closeLightbox = () => {
    if (new URLSearchParams(location.search).get("photo")) {
      navigate(location.pathname, {replace: true});
    }
    setCurrentPhotoId(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const photoId = params.get("photo");
    if (photoId) {
      setCurrentPhotoId(photoId);
    } else {
      setCurrentPhotoId(null);
    }
  }, [location.search]);

  const currentIndex = photos.findIndex((p) => p.id === currentPhotoId);

  return (
    <div>
      <Hero onMenuOpen={() => setMenuOpen(true)}/>
      <StickyNav onMenuOpen={() => setMenuOpen(true)}/>
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)}/>

      <Featured onOpen={openLightbox}/>

      <section id="galleria" className="section">
        <div className="section-header">
          <p className="overline">Portfolio</p>
          <h2 className="section-title">Galleria</h2>
          <p className="section-sub">
            {activeSpecies
              ? `${filteredPhotos.length} scatti di ${SPECIES_IT[activeSpecies] ?? activeSpecies}`
              : `${photos.length} scatti tra risaie, lanche e garzaie`}
          </p>
        </div>
        <SpeciesFilter active={activeSpecies} onChange={setActiveSpecies}/>
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
      </section>

      <About/>

      <Contacts/>

      <LightboxBackdrop
        photo={currentIndex >= 0 ? photos[currentIndex] : null}
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
          plugins={[Zoom, Captions, Counter, Thumbnails]}
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
          toolbar={{
            buttons: [
              <button
                key="hq"
                type="button"
                className="yarl__button"
                title="Apri in alta qualità"
                aria-label="Apri la foto in alta qualità in una nuova scheda"
                onClick={() =>
                  window.open(
                    photos[currentIndex].original ?? photos[currentIndex].src,
                    "_blank",
                    "noopener",
                  )
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5"/>
                  <path d="M6.5 9v6M10.5 9v6M6.5 12h4"/>
                  <circle cx="15.9" cy="11.6" r="2.4"/>
                  <path d="M17.2 13.2l1.4 1.6"/>
                </svg>
              </button>,
              <button
                key="info"
                type="button"
                className="yarl__button"
                title="Informazioni"
                aria-label="Mostra o nascondi i dati della foto"
                onClick={toggleCaptions}
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
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M12 11v5"/>
                  <path d="M12 7.6v.01"/>
                </svg>
              </button>,
              <button
                key="share"
                type="button"
                className="yarl__button"
                title="Condividi"
                aria-label="Condividi la foto"
                onClick={() => sharePhoto(photos[currentIndex])}
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
          captions={{ref: captionsRef, hidden: true}}
          counter={{
            container: {
              style: {top: "unset", left: "unset", bottom: 0, right: 0},
            },
          }}
          on={{
            view: ({index}) => {
              const nextId = photos[index].id;
              setCurrentPhotoId(nextId);
              // Low-priority URL sync: the router re-render must not compete
              // with the swipe animation for main-thread time
              startTransition(() => {
                navigate(`${location.pathname}?photo=${nextId}`, {
                  replace: true,
                });
              });
            },
          }}
        />
      )}
    </div>
  );
}
