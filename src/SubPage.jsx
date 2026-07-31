import {useEffect} from "react";
import {Link} from "react-router";

// Shared shell for the routes that are not the gallery (species index, stats).
// Like the legal pages, they land mid-page after the hash change, so the
// scroll position is reset on mount.
export function SubPage({overline, title, sub, wide, children}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className={`policy subpage${wide ? " subpage-wide" : ""}`}>
      <Link className="policy-back" to="/">← Torna alla galleria</Link>
      {overline && <p className="overline">{overline}</p>}
      <h1 className="policy-title">{title}</h1>
      {sub && <p className="subpage-sub">{sub}</p>}
      {children}
    </main>
  );
}
