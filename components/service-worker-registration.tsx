"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA support is opportunistic; the core app still works without a service worker.
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(register, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(register, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return null;
}
