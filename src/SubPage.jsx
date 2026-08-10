import {useEffect} from "react";
import {Link} from "react-router";
import {useLang} from "./lang";

// Shared shell for the routes that are not the gallery (species index, stats,
// the legal pages). Like the gallery they land mid-page after the hash change,
// so the scroll position is reset on mount.
//
// No language or theme toggle here: those two only live on the homepage nav,
// see CLAUDE.md. A visitor who wants to switch either goes back there first.
export function SubPage({overline, title, sub, wide, children}) {
  const {t} = useLang();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className={`policy subpage${wide ? " subpage-wide" : ""}`}>
      <div className="subpage-top">
        <Link className="policy-back" to="/">{t.backToGallery}</Link>
      </div>
      {overline && <p className="overline">{overline}</p>}
      <h1 className="policy-title">{title}</h1>
      {sub && <p className="subpage-sub">{sub}</p>}
      {children}
    </main>
  );
}
