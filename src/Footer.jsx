export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <p className="footer-mark">Daniele Bartorilla</p>
      <p className="footer-tagline">Fotografia naturalistica</p>
      <p>© {year} Daniele Bartorilla. Tutti i diritti sul sito, relativi contenuti e foto sono riservati.</p>
      {/* Plain hash links: the footer lives outside the RouterProvider */}
      <p className="footer-legal">
        <a href="#/privacy">Privacy Policy</a>
        <span aria-hidden="true"> · </span>
        <a href="#/cookie">Cookie Policy</a>
      </p>
    </footer>
  );
};
