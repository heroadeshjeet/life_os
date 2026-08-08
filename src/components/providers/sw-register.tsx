"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for offline support.
 * Only runs in production to avoid caching issues during development.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[sw] registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[sw] registration failed:", err);
        });
    };

    // Register after page load to avoid blocking
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
