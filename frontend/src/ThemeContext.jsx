import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Read from localStorage on first render
    try {
      return localStorage.getItem("theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    // Apply to <html> and persist
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (t) => {
    const next = t === "light" ? "light" : "dark";
    setThemeState(next);
  };

  const toggleTheme = () => setThemeState((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
