import { useCallback, useState } from "react";

const KEY = "ks-privacy-mode-v1";

export function readPrivacyHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function usePrivacyMode() {
  const [hidden, setHidden] = useState(readPrivacyHidden);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { hidden, toggle };
}
