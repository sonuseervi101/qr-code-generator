import { useEffect, useState } from "react";

// Like useState, but the value is also saved in the browser's localStorage,
// so it is still there after the page is refreshed.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue; // storage blocked or corrupted: start fresh
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked. The app keeps working, it just won't remember.
    }
  }, [key, value]);

  return [value, setValue];
}
