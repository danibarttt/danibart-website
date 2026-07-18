export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <p className="footer-mark">Daniele Bartorilla</p>
      <p>© {year} Daniele Bartorilla. Tutti i diritti sul sito, relativi contenuti e foto sono riservati.</p>
    </footer>
  );
};
