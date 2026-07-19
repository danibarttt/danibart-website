import {useState, useEffect, useRef} from "react";
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

const heroPhoto = photos.find((p) => p.hero) ?? photos[0];

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
  const [visible, setVisible] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
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
      <picture>
        {heroPhoto.heroWebp && (
          <source srcSet={heroPhoto.heroWebp} type="image/webp"/>
        )}
        <img
          className={`hero-bg${bgLoaded ? " loaded" : ""}`}
          src={heroPhoto.heroSrc ?? heroPhoto.src}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onLoad={() => setBgLoaded(true)}
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

function GalleryItem({photo, index, onOpen}) {
  const [loaded, setLoaded] = useState(false);
  const [ref, shown] = useReveal();

  return (
    <figure
      ref={ref}
      className={`gallery-item reveal-item${shown ? " shown" : ""}`}
      style={{transitionDelay: `${(index % 3) * 80}ms`}}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
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
          alt={photo.title}
          src={photo.thumbnail}
          loading="lazy"
          decoding="async"
          width={photo.width}
          height={photo.height}
          className={loaded ? "loaded" : ""}
          onLoad={() => setLoaded(true)}
        />
      </picture>
      <figcaption className="gallery-caption">
        {photo.title}
        {photo.species && (
          <span className="gallery-caption-species">{photo.species}</span>
        )}
      </figcaption>
    </figure>
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

// Fullscreen ambient backdrop for the lightbox: the current photo's
// thumbnail hyper-blurred under a dark overlay, crossfading on navigation
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

  return (
    <div
      className={`lightbox-backdrop${photo ? " shown" : ""}`}
      aria-hidden="true"
    >
      {layers.map((p) => (
        <img key={p.id} src={p.thumbnailWebp ?? p.thumbnail} alt=""/>
      ))}
    </div>
  );
}

// Blur-up for the lightbox: while the fullsize photo downloads, show the
// thumbnail hyper-blurred (stacked over the inline base64 placeholder, which
// paints instantly), then fade it out once the real image is in
function BlurUpSlide({slide, offset, rect, onClick}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div
        className={`slide-blur-up${loaded ? " hidden" : ""}`}
        aria-hidden="true"
      >
        {slide.blur && <img src={slide.blur} alt=""/>}
        <img src={slide.thumbnail} alt=""/>
      </div>
      <ImageSlide
        slide={slide}
        offset={offset}
        rect={rect}
        onClick={onClick}
        onLoad={() => setLoaded(true)}
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

  useEffect(() => () => clearTimeout(shareToastTimer.current), []);

  const toggleCaptions = () => {
    (captionsRef.current?.visible
      ? captionsRef.current?.hide
      : captionsRef.current?.show)?.();
  };

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

  const openLightbox = (id) => {
    navigate(`${location.pathname}?photo=${id}`, {replace: false});
  };

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

      <section id="galleria" className="section">
        <div className="section-header">
          <p className="overline">Portfolio</p>
          <h2 className="section-title">Galleria</h2>
          <p className="section-sub">
            {photos.length} scatti tra risaie, lanche e garzaie
          </p>
        </div>
        <div className="gallery-grid">
          {photos.map((photo, index) => (
            <GalleryItem
              key={photo.id}
              photo={photo}
              index={index}
              onOpen={() => openLightbox(photo.id)}
            />
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
          slides={photos.map((photo) => ({
            src: photo.src,
            // width/height also feed the Zoom plugin's max-zoom computation
            width: photo.width,
            height: photo.height,
            // The webp variant is what the gallery <picture> already
            // downloaded, so the filmstrip and blur-up hit the browser cache
            thumbnail: photo.thumbnailWebp ?? photo.thumbnail,
            blur: photo.blur,
            description: buildCaption(photo),
          }))}
          // Default preload (2 per side) downloads 4 fullsize photos in the
          // background; 1 per side keeps prev/next instant at half the traffic
          carousel={{preload: 1}}
          render={{
            slide: ({slide, offset, rect}) => (
              <BlurUpSlide
                slide={slide}
                offset={offset}
                rect={rect}
                onClick={offset === 0 ? toggleCaptions : undefined}
              />
            ),
          }}
          plugins={[Zoom, Captions, Counter, Thumbnails]}
          open={true}
          close={closeLightbox}
          index={currentIndex}
          animation={{fade: 400, swipe: 450, navigation: 300}}
          controller={{closeOnBackdropClick: true, closeOnPullDown: true}}
          toolbar={{
            buttons: [
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
              navigate(`${location.pathname}?photo=${nextId}`, {replace: true});
            },
          }}
        />
      )}
    </div>
  );
}
