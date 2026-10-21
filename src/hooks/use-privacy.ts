import { useCallback, useEffect, useState } from "react";

const KEY = "ks-privacy-mode-v1";
const EVENT = "ks-privacy-change";

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

  // Mantém todas as instâncias (botão, páginas, barra de métricas) em sinconia
  useEffect(() => {
    const sync = () => setHidden(readPrivacyHidden());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const toggle = useCallback(() => {
    const next = !readPrivacyHidden();
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
    setHidden(next);
  }, []);

  return { hidden, toggle };
}
