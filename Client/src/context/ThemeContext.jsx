import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("selected-theme") || "original";
  });

  const [mode, setModeState] = useState(() => {
    const storedMode = localStorage.getItem("selected-mode");
    if (storedMode) return storedMode;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [showThemePicker, setShowThemePicker] = useState(false);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("selected-theme", newTheme);
  };

  const setMode = (newMode) => {
    setModeState(newMode);
    localStorage.setItem("selected-mode", newMode);
  };

  const toggleThemePicker = () => {
    setShowThemePicker(prev => !prev);
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Clean old theme classes
    const classesToRemove = Array.from(root.classList).filter(c => c.startsWith("theme-") || c === "dark");
    classesToRemove.forEach(c => root.classList.remove(c));
    
    // Add new theme class (only if NOT original)
    if (theme && theme !== "original") {
      root.classList.add(`theme-${theme}`);
    }
    
    // Add dark class if dark mode
    if (mode === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [theme, mode]);

  // Backward compatibility support for older components looking for isDark and toggleTheme
  const isDark = mode === "dark";
  const toggleTheme = () => {
    setMode(isDark ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      mode,
      setMode,
      toggleThemePicker,
      showThemePicker,
      isDark,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}