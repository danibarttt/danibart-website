import {useMemo} from "react";
import {Link} from "react-router";
import photos from "./photos";
import {collectSpecies, commonName, speciesSlug, splitSpecies} from "./species.mjs";
import {SubPage} from "./SubPage";

// EXIF DateTimeOriginal has no timezone, so exif-reader returns a Date built as
// if the wall-clock time were UTC. Everything here reads it back with the UTC
// accessors, which gives the time the camera actually recorded — the local
// accessors would shift every shot by the viewer's own offset.
const dated = photos.filter((photo) => photo.dateTaken).map((photo) => ({
  photo,
  at: new Date(photo.dateTaken),
}));

const MONTHS_IT = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];

const monthLabel = (year, month) => `${MONTHS_IT[month]} ${year}`;

/* ---------- data ---------- */

// One bucket per calendar month between the first and last shot, empty months
// included: dropping them would compress the gaps and misstate the rhythm.
function photosPerMonth() {
  if (dated.length === 0) return [];
  const times = dated.map((entry) => entry.at.getTime());
  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));

  const counts = new Map();
  for (const {at} of dated) {
    const key = `${at.getUTCFullYear()}-${at.getUTCMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets = [];
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth();
  while (year < last.getUTCFullYear() || (year === last.getUTCFullYear() && month <= last.getUTCMonth())) {
    // January and the first bucket anchor the axis: they carry the year (the
    // span crosses one, so a bare "mag" would appear twice meaning different
    // months) and they are the labels kept when narrow screens hide the rest
    const major = month === 0 || buckets.length === 0;
    buckets.push({
      key: `${year}-${month}`,
      label: major ? `${MONTHS_IT[month]} ${String(year).slice(2)}` : MONTHS_IT[month],
      full: monthLabel(year, month),
      major,
      value: counts.get(`${year}-${month}`) ?? 0,
    });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return buckets;
}

function photosPerSpecies() {
  return collectSpecies(photos)
    .map((latin) => ({
      key: latin,
      label: commonName(latin),
      slug: speciesSlug(latin),
      value: photos.filter(
        (photo) => photo.species && splitSpecies(photo.species).includes(latin),
      ).length,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "it"));
}

// Continuous span from the earliest to the latest hour of the day with a shot,
// so the empty hours in between stay visible as gaps
function photosPerHour() {
  if (dated.length === 0) return [];
  const hours = dated.map(({at}) => at.getUTCHours());
  const counts = new Map();
  for (const hour of hours) counts.set(hour, (counts.get(hour) ?? 0) + 1);

  const from = Math.min(...hours);
  const to = Math.max(...hours);
  return Array.from({length: to - from + 1}, (_, index) => {
    const hour = from + index;
    return {
      key: hour,
      label: `${hour}`,
      full: `ore ${hour}:00`,
      major: hour % 3 === 0 || index === 0,
      value: counts.get(hour) ?? 0,
    };
  });
}

// ISO is ordinal, so the buckets stay in numeric order rather than by count
function photosPerIso() {
  const counts = new Map();
  for (const photo of photos) {
    const iso = photo.exif?.iso;
    if (iso) counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([iso, value]) => ({key: iso, label: `${iso}`, full: `ISO ${iso}`, major: true, value}));
}

// The two bodies write the same lens under different names ("EF400mm f/5.6L
// USM" vs "Canon EF 400mm f/5.6L"), so entries are grouped on a normalized key
// — brand prefix, punctuation and the motor designation dropped — and shown
// under the most descriptive of the spellings seen.
const lensKey = (lens) =>
  lens
    .toLowerCase()
    .replace(/canon/g, "")
    .replace(/\b(usm|stm)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

function gear() {
  const cameras = new Map();
  const lenses = new Map();
  for (const photo of photos) {
    const {camera, lens} = photo.exif ?? {};
    if (camera) cameras.set(camera, (cameras.get(camera) ?? 0) + 1);
    if (lens) {
      const key = lensKey(lens);
      const previous = lenses.get(key);
      lenses.set(key, {
        name: !previous || lens.length > previous.name.length ? lens : previous.name,
        count: (previous?.count ?? 0) + 1,
      });
    }
  }
  return {
    cameras: [...cameras.entries()]
      .map(([name, count]) => ({name, count}))
      .sort((a, b) => b.count - a.count),
    lenses: [...lenses.values()].sort((a, b) => b.count - a.count),
  };
}

// The single value that covers most of the catalog, for the stat tiles: a
// distribution this lopsided (nearly every shot at the same focal length) is a
// number, not a chart
function dominant(pick) {
  const counts = new Map();
  let total = 0;
  for (const photo of photos) {
    const value = pick(photo.exif ?? {});
    if (value === undefined || value === null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
    total += 1;
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && {value: best[0], count: best[1], total};
}

/* ---------- chart primitives ---------- */

// Bars are plain elements rather than SVG: an SVG scaled to a phone shrinks its
// own labels into illegibility, while a flex row reflows and keeps the text at
// its real size.
function Columns({data, caption, unit = "scatti"}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <figure className="chart">
      <figcaption className="chart-caption">{caption}</figcaption>
      <div className="chart-columns" role="img" aria-label={caption}>
        {data.map((d) => (
          <div className="chart-column" key={d.key} title={`${d.full}: ${d.value} ${unit}`}>
            {/* No mark at all for an empty bucket: the fill has a minimum
                height so a count of 1 stays visible, and drawing that sliver
                for a zero would read as a small value rather than none */}
            <div className="chart-column-track">
              {d.value > 0 && (
                <div
                  className="chart-column-fill"
                  style={{height: `${(d.value / max) * 100}%`}}
                >
                  <span className="chart-column-value">{d.value}</span>
                </div>
              )}
            </div>
            <span className={`chart-column-label${d.major ? " major" : ""}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <details className="chart-table">
        <summary>Vedi i dati</summary>
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.full}</th>
                <td>{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// Horizontal bars for the species ranking: 15 nominal categories need readable
// names, which only fit alongside the bar. Every value is labelled at the tip,
// so nothing is locked behind a hover.
function Bars({data, caption}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <figure className="chart">
      <figcaption className="chart-caption">{caption}</figcaption>
      <ul className="chart-bars">
        {data.map((d) => (
          <li key={d.key}>
            <Link to={`/?specie=${d.slug}`}>
              <span className="chart-bar-label">{d.label}</span>
              <span className="chart-bar-track">
                <span
                  className="chart-bar-fill"
                  style={{width: `${(d.value / max) * 100}%`}}
                />
              </span>
              <span className="chart-bar-value">{d.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Tile({label, value, sub}) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
      {sub && <span className="stat-tile-sub">{sub}</span>}
    </div>
  );
}

/* ---------- page ---------- */

export default function Stats() {
  const months = useMemo(photosPerMonth, []);
  const species = useMemo(photosPerSpecies, []);
  const hours = useMemo(photosPerHour, []);
  const isos = useMemo(photosPerIso, []);
  const {cameras, lenses} = useMemo(gear, []);
  const focal = useMemo(() => dominant((exif) => exif.focalLength), []);
  const aperture = useMemo(() => dominant((exif) => exif.fNumber), []);

  const span =
    dated.length > 0
      ? `${months[0].full} — ${months[months.length - 1].full}`
      : "—";
  const busiest = months.reduce(
    (best, month) => (month.value > (best?.value ?? 0) ? month : best),
    null,
  );

  return (
    <SubPage
      overline="Dietro le quinte"
      title="Numeri"
      sub="Cosa raccontano i dati di scatto delle foto in galleria: quando esco, cosa incontro e con che impostazioni."
      wide
    >
      <div className="stat-tiles">
        <Tile label="Scatti pubblicati" value={photos.length} sub={span}/>
        <Tile
          label="Specie"
          value={species.length}
          sub={`la più frequente è ${species[0]?.label.toLowerCase()}`}
        />
        {focal && (
          <Tile
            label="Focale preferita"
            value={`${focal.value} mm`}
            sub={`in ${focal.count} scatti su ${focal.total}`}
          />
        )}
        {aperture && (
          <Tile
            label="Diaframma più usato"
            value={`ƒ/${aperture.value}`}
            sub={`in ${aperture.count} scatti su ${aperture.total}`}
          />
        )}
      </div>

      <Columns
        data={months}
        caption={`Scatti per mese${busiest ? ` — il mese più prolifico è ${busiest.full}, con ${busiest.value}` : ""}`}
      />

      <Bars data={species} caption="Specie più fotografate — tocca una barra per vedere gli scatti"/>

      <Columns
        data={hours}
        caption="Ora del giorno — l'orario registrato dalla fotocamera"
      />

      <Columns data={isos} caption="Sensibilità ISO" unit="scatti"/>

      <h2 className="stats-heading">Attrezzatura</h2>
      <table className="gear-table">
        <tbody>
          {cameras.map(({name, count}) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>Corpo macchina</td>
              <td>{count}</td>
            </tr>
          ))}
          {lenses.map(({name, count}) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>Obiettivo</td>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="stats-note">
        I dati arrivano dai metadati EXIF delle foto, letti in fase di build. Le
        coordinate GPS vengono invece rimosse da tutte le immagini pubblicate.
      </p>
    </SubPage>
  );
}
