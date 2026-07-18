import {useState, useEffect, useRef} from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {useNavigate, useLocation} from "react-router";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";
import photos from "./photos";
import "./lightbox.css";

function Header() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transition: "opacity 200ms ease",
    }}>
      <h1 style={{fontSize: '40px', textAlign: "center"}}>
        Aironi e altro
      </h1>
      <h4 style={{textAlign: "center", fontStyle: "italic", marginBottom: "50px"}}>
        Foto di Daniele Bartorilla
      </h4>
    </div>
  )
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
      <Header/>
      <div
        style={{
          columnCount: 3,
          columnGap: "4px",
        }}
      >
        {photos.map((photo) => (
          <img
            key={photo.id}
            alt={photo.title}
            src={photo.thumbnail}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              marginBottom: "4px",
              cursor: "pointer",
              opacity: 0,
              transition: "opacity 0.7s ease-in-out",
            }}
            onLoad={(e) => (e.currentTarget.style.opacity = 1)}
            onClick={() => openLightbox(photo.id)}
          />
        ))}
      </div>

      {currentIndex >= 0 && (
        <Lightbox
          slides={photos.map((photo) => ({
            src: photo.src,
            title: photo.title,
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
