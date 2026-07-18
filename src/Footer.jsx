import {useEffect, useState} from "react";

export const Footer = () => {
  const [visible, setVisible] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <footer
      style={{
        textAlign: 'center',
        padding: "80px 40px 40px 20px",
        fontSize: '12px',
        color: '#FFF',
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
      }}>
      <p>© {year} Daniele Bartorilla. Tutti i diritti sul sito, relativi contenuti e foto sono riservati.</p>
    </footer>
  );
};