import {useState, useEffect, useRef} from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {useNavigate, useLocation} from "react-router";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";
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

function Hero() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className="hero">
      <img className="hero-bg" src={heroPhoto.src} alt="" aria-hidden="true"/>
      <div className="hero-overlay"/>
      <nav className="nav">
        <span className="nav-brand">DB</span>
        <div className="nav-links">
          <button onClick={() => scrollTo("galleria")}>Galleria</button>
          <button onClick={() => scrollTo("chi-sono")}>Chi sono</button>
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

function GalleryItem({photo, onOpen}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <figure
      className="gallery-item"
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
          Scatto principalmente nel pavese, tra risaie, lanche e garzaie. Ogni
          foto nasce da attese silenziose all'alba, quando la luce è morbida e
          gli animali si muovono indisturbati. Questo sito raccoglie le
          immagini a cui sono più legato.
        </p>
      </div>
    </section>
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

      <section id="galleria" className="section">
        <div className="section-header">
          <h2 className="section-title">Galleria</h2>
        </div>
        <div className="gallery-grid">
          {photos.map((photo) => (
            <GalleryItem
              key={photo.id}
              photo={photo}
              onOpen={() => openLightbox(photo.id)}
            />
          ))}
        </div>
      </section>

      <About/>

      {currentIndex >= 0 && (
        <Lightbox
          slides={photos.map((photo) => ({
            src: photo.src,
            title: photo.title,
            description: photo.description || undefined,
          }))}
          plugins={[Zoom, Captions]}
          open={true}
          close={closeLightbox}
          index={currentIndex}
          captions={{ref: captionsRef}}
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
