import {useMemo} from "react";
import {Link} from "react-router";
import photos from "./photos";
import {photoTitle} from "./i18n.mjs";
import {useLang} from "./lang";
import {collectSpecies, commonName, speciesSlug, splitSpecies} from "./species.mjs";
import {SubPage} from "./SubPage";

// One card per species: the most recent photo of it as cover, the common and
// Latin names, and how many shots there are. Each card links into the gallery
// with that species preselected (?specie=), which is why the gallery keeps its
// filters in the query string. The slug in that parameter stays the Italian
// one in both languages — it is an id, not a word anyone reads.
function buildSpecies(lang) {
  return collectSpecies(photos, lang).map((latin) => {
    const taken = photos.filter(
      (photo) => photo.species && splitSpecies(photo.species).includes(latin),
    );
    return {
      latin,
      name: commonName(latin, lang),
      slug: speciesSlug(latin),
      // photos is already ordered by shooting date, most recent first
      cover: taken[0],
      count: taken.length,
    };
  });
}

export default function SpeciesIndex() {
  const {lang, t} = useLang();
  const species = useMemo(() => buildSpecies(lang), [lang]);

  return (
    <SubPage
      overline={t.speciesIndexOverline}
      title={t.speciesIndexTitle}
      sub={t.speciesIndexSub(species.length, photos.length)}
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
                  alt={`${name} — ${photoTitle(cover, lang)}`}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <span className="species-index-text">
                <span className="species-index-name">{name}</span>
                <span className="species-index-latin">{latin}</span>
              </span>
              <span className="species-index-count">{t.shots(count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SubPage>
  );
}
