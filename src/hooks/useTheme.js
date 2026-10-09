import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/constants";

// Theme can be "system" (follow the device), "light" or "dark".
const ORDER = ["system", "light", "dark"];

export function useTheme() {
  const [theme, setTheme] = useLocalStorage(STORAGE_KEYS.theme, "system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  function cycleTheme() {
    setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);
  }

  return [theme, cycleTheme];
}
