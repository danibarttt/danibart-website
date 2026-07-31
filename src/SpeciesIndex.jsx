import {useMemo} from "react";
import {Link} from "react-router";
import photos from "./photos";
import {collectSpecies, commonName, speciesSlug, splitSpecies} from "./species.mjs";
import {SubPage} from "./SubPage";

// One card per species: the most recent photo of it as cover, the Italian and
// Latin names, and how many shots there are. Each card links into the gallery
// with that species preselected (?specie=), which is why the gallery keeps its
// filters in the query string.
function buildSpecies() {
  return collectSpecies(photos).map((latin) => {
    const taken = photos.filter(
      (photo) => photo.species && splitSpecies(photo.species).includes(latin),
    );
    return {
      latin,
      name: commonName(latin),
      slug: speciesSlug(latin),
      // photos is already ordered by shooting date, most recent first
      cover: taken[0],
      count: taken.length,
    };
  });
}

export default function SpeciesIndex() {
  const species = useMemo(buildSpecies, []);

  return (
    <SubPage
      overline="Indice"
      title="Specie fotografate"
      sub={`${species.length} specie in ${photos.length} scatti. Tocca una specie per vederne tutte le foto.`}
      wide
    >
      <ul className="species-index">
        {species.map(({latin, name, slug, cover, count}) => (
          <li key={latin}>
            <Link to={`/?specie=${slug}`}>
              <picture>
                {cover.thumbnailAvif && (
                  <source srcSet={cover.thumbnailAvif} type="image/avif"/>
                )}
                {cover.thumbnailWebp && (
                  <source srcSet={cover.thumbnailWebp} type="image/webp"/>
                )}
                <img
                  src={cover.thumbnail}
                  alt={`${name} — ${cover.title}`}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <span className="species-index-text">
                <span className="species-index-name">{name}</span>
                <span className="species-index-latin">{latin}</span>
              </span>
              <span className="species-index-count">
                {count} {count === 1 ? "scatto" : "scatti"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SubPage>
  );
}
