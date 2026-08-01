// The React half of src/i18n.mjs (which stays free of React so the static page
// generator can import it under Node). One context at the root of the app: the
// language is a global preference like the theme, not part of the URL, so a
// change here re-renders everything at once and nothing has to be kept in sync.
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {activeLang, setLang as storeLang, strings, watchStoredLang} from "./i18n.mjs";

const LangContext = createContext(null);

export function LangProvider({children}) {
  const [lang, setLang] = useState(activeLang);

  // Another tab switching language writes the same localStorage key
  useEffect(() => watchStoredLang(setLang), []);

  // index.html ships lang="it" and an Italian <title> — they are what a
  // crawler that runs no JS sees, and the static pages carry the real
  // per-language markup. Once the bundle is running, the document has to say
  // what the page actually is, for screen readers and for translation tools.
  useEffect(() => {
    const t = strings(lang);
    document.documentElement.lang = lang;
    document.title = t.siteName;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t.siteDescription);
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      t: strings(lang),
      switchLang: next => {
        storeLang(next);
        setLang(next);
      },
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
