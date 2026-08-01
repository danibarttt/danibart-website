// The two preference buttons that sit in the nav bars, the mobile drawer and
// the header of every sub-page. Both work the same way: three states, two of
// them stored (see theme.mjs and i18n.mjs), and both label themselves with the
// state a click switches *to*, since either reading of a bare glyph or code is
// defensible.
import {useEffect, useState} from "react";
import {useLang} from "./lang";
import {activeTheme, setTheme as applyThemeChoice, watchSystemTheme} from "./theme.mjs";

// Sun/moon: the icon shows the theme the click switches to — a sun while the
// page is dark — and the label spells that out.
export function ThemeToggle({label = false}) {
  const {t} = useLang();
  const [theme, setTheme] = useState(activeTheme);

  useEffect(() => watchSystemTheme(setTheme), []);

  const next = theme === "dark" ? "light" : "dark";
  const switchTheme = () => {
    applyThemeChoice(next);
    setTheme(next);
  };
  const action = next === "light" ? t.themeToLight : t.themeToDark;

  return (
    <button
      className={`theme-toggle${label ? " theme-toggle-labelled" : ""}`}
      onClick={switchTheme}
      title={action}
      aria-label={action}
    >
      {next === "light" ? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2"/>
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/>
        </svg>
      )}
      {label && <span>{next === "light" ? t.themeLight : t.themeDark}</span>}
    </button>
  );
}

// The same circle, worded instead of drawn: it carries the two-letter code of
// the language a click switches to. The accessible name is written in that
// same target language — the visitor who needs this button is by definition
// the one who cannot read the page as it stands.
export function LangToggle({label = false}) {
  const {lang, t, switchLang} = useLang();
  const next = lang === "it" ? "en" : "it";

  return (
    <button
      className={`theme-toggle lang-toggle${label ? " theme-toggle-labelled" : ""}`}
      onClick={() => switchLang(next)}
      title={t.langSwitch}
      aria-label={t.langSwitch}
      lang={next}
    >
      {/* The code takes the place the sun/moon glyph holds on the theme
          toggle — same width, so the two labelled pills line their text up in
          the drawer, where the bare code would be too terse on its own */}
      <span className="lang-toggle-code">{t.langCode}</span>
      {label && <span>{t.langSwitchName}</span>}
    </button>
  );
}
