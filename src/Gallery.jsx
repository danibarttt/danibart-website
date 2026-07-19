import {useState, useEffect, useRef} from "react";
import Lightbox from "yet-another-react-lightbox";
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

// Frosted-glass nav + back-to-top button, both appear once the hero is scrolled past
function StickyNav() {
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
        <div
          className="nav-progress"
          style={{transform: `scaleX(${progress})`}}
        />
      </nav>
      <button
        className={`to-top${shown ? " shown" : ""}`}
        inert={!shown}
        onClick={scrollToTop}
        aria-label="Torna in cima"
      >
        ↑
      </button>
    </>
  );
}

function Hero() {
  const [visible, setVisible] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className="hero">
      {/* Blurred thumbnail shows instantly while the real background loads */}
      <img className="hero-bg hero-bg-placeholder" src={heroPhoto.thumbnail} alt="" aria-hidden="true"/>
      <img
        className={`hero-bg${bgLoaded ? " loaded" : ""}`}
        src={heroPhoto.heroSrc ?? heroPhoto.src}
        alt=""
        aria-hidden="true"
        onLoad={() => setBgLoaded(true)}
      />
      <div className="hero-overlay"/>
      <div className="hero-grain"/>
      <nav className="nav">
        <div className="nav-links">
          <button onClick={() => scrollTo("galleria")}>Galleria</button>
          <button onClick={() => scrollTo("chi-sono")}>Chi sono</button>
          <button onClick={() => scrollTo("contatti")}>Contatti</button>
        </div>
      </nav>
      <div className={`hero-content${visible ? " visible" : ""}`}>
        <h1>Daniele Bartorilla</h1>
        <p className="overline">Fotografia naturalistica</p>
        <p className="hero-tagline">
          Aironi, cormorani e gli altri abitanti delle zone umide, raccontati
          attraverso l'obiettivo.
        </p>
      </div>
      <button
        className="scroll-hint"
        onClick={() => scrollTo("galleria")}
        aria-label="Vai alla galleria"
      >
        ↓
      </button>
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
      <img
        alt={photo.title}
        src={photo.thumbnail}
        loading="lazy"
        className={loaded ? "loaded" : ""}
        onLoad={() => setLoaded(true)}
      />
      <figcaption className="gallery-caption">{photo.title}</figcaption>
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
          foto a cui tengo di più, spero vi piacciano!
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
        <img key={p.id} src={p.thumbnail} alt=""/>
      ))}
    </div>
  );
}

export default function Gallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPhotoId, setCurrentPhotoId] = useState(null);
  const captionsRef = useRef(null);

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
      <Hero/>
      <StickyNav/>

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

      {currentIndex >= 0 && (
        <Lightbox
          slides={photos.map((photo) => ({
            src: photo.src,
            thumbnail: photo.thumbnail,
            title: photo.title,
            description: photo.description || undefined,
          }))}
          plugins={[Zoom, Captions, Counter, Thumbnails]}
          open={true}
          close={closeLightbox}
          index={currentIndex}
          animation={{fade: 400, swipe: 450, navigation: 300}}
          controller={{closeOnBackdropClick: true, closeOnPullDown: true}}
          thumbnails={{
            width: 96,
            height: 64,
            gap: 10,
            padding: 0,
            imageFit: "cover",
            vignette: false,
          }}
          captions={{ref: captionsRef}}
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
            click: () => {
              (captionsRef.current?.visible
                ? captionsRef.current?.hide
                : captionsRef.current?.show)?.();
            },
          }}
        />
      )}
    </div>
  );
}
