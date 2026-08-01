import {licensePath} from "./i18n.mjs";
import {useLang} from "./lang";

export const Footer = () => {
  const {lang, t} = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <p className="footer-mark">Daniele Bartorilla</p>
      <p className="footer-tagline">{t.tagline}</p>
      <p>{t.footerRights(year)}</p>
      {/* Plain hash links: the footer lives outside the RouterProvider */}
      <p className="footer-legal">
        <a href="#/specie">{t.navSpecies}</a>
        <span aria-hidden="true"> · </span>
        <a href="#/numeri">{t.navNumbers}</a>
        <span aria-hidden="true"> · </span>
        {/* A static page, not a route: a real path rather than a hash link */}
        <a href={licensePath(lang)}>{t.footerLicense}</a>
        <span aria-hidden="true"> · </span>
        <a href="#/privacy">{t.footerPrivacy}</a>
        <span aria-hidden="true"> · </span>
        <a href="#/cookie">{t.footerCookie}</a>
      </p>
    </footer>
  );
};
