// Theme handling, shared by the app and (as an inlined copy, see
// THEME_BOOT_SCRIPT in generate-static-pages.mjs) the static pages.
//
// Three states, two of them stored: no stored value means "follow the device",
// which the CSS already does through prefers-color-scheme. A stored value
// pins data-theme on <html> and the CSS overrides win over the media query.

export const THEME_KEY = "theme";

// Private mode on iOS Safari throws on localStorage access rather than
// returning null, and a theme preference is not worth a broken page
const readStore = key => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStore = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the choice just will not survive the visit */
  }
};

export const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

export const storedTheme = () => {
  const value = readStore(THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
};

export const activeTheme = () => storedTheme() ?? systemTheme();

// The browser UI (address bar on mobile, window chrome) should match the page
const syncThemeColor = theme => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f6f4ef" : "#0b0c0b");
};

export const applyTheme = theme => {
  document.documentElement.setAttribute("data-theme", theme);
  syncThemeColor(theme);
};

// Choosing the theme the device already asks for clears the override instead
// of pinning it, so the site goes back to following the device afterwards
export const setTheme = theme => {
  if (theme === systemTheme()) {
    writeStore(THEME_KEY, null);
    document.documentElement.removeAttribute("data-theme");
  } else {
    writeStore(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }
  syncThemeColor(theme);
};

// Keeps an un-overridden page in step when the device flips theme mid-visit
export const watchSystemTheme = onChange => {
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  const handler = () => {
    if (!storedTheme()) onChange(systemTheme());
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
};
