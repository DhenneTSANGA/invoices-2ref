import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";
type Ctx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  /** false pendant le premier paint SSR/hydratation — évite mismatch icône */
  ready: boolean;
};

const ThemeContext = createContext<Ctx>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
  ready: false,
});

const THEME_KEY = "2ref-auto-theme";
const USER_KEY = "2ref-auto-theme-user";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Toujours "light" au premier rendu (SSR + hydratation) — aligné avec le HTML serveur
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  const setTheme = useCallback((t: Theme) => {
    if (typeof window !== "undefined") localStorage.setItem(USER_KEY, "1");
    setThemeState(t);
  }, []);

  useEffect(() => {
    const userChose = localStorage.getItem(USER_KEY);
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const initial: Theme =
      userChose && (stored === "dark" || stored === "light") ? stored : "light";
    setThemeState(initial);
    if (!userChose) localStorage.setItem(THEME_KEY, "light");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, ready]);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, toggle, setTheme, ready }),
    [theme, toggle, setTheme, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
