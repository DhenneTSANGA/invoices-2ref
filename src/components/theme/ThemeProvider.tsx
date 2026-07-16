import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx>({ theme: "light", toggle: () => {}, setTheme: () => {} });

const THEME_KEY = "facturia-theme";
const USER_KEY = "facturia-theme-user";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  const setTheme = useCallback((t: Theme) => {
    if (typeof window !== "undefined") localStorage.setItem(USER_KEY, "1");
    setThemeState(t);
  }, []);

  useEffect(() => {
    const userChose = typeof window !== "undefined" && localStorage.getItem(USER_KEY);
    const stored = (typeof window !== "undefined" && localStorage.getItem(THEME_KEY)) as Theme | null;
    // Clair par défaut — le dark OS n'est jamais appliqué automatiquement
    const initial: Theme = userChose && (stored === "dark" || stored === "light") ? stored : "light";
    setThemeState(initial);
    if (!userChose && typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, "light");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
