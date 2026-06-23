"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; "error-callback": () => void }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !ref.current) {
      setToken("development-bypass");
      return;
    }

    const load = () => {
      if (!ref.current || !window.turnstile) return;
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: setToken,
        "error-callback": () => setToken("")
      });
    };

    if (window.turnstile) {
      load();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = load;
    document.head.appendChild(script);
  }, [siteKey]);

  return (
    <div className="turnstile-field">
      <input type="hidden" name="turnstileToken" value={token} />
      {siteKey ? <div ref={ref} /> : <p className="form-hint">Turnstile ist lokal im Dev-Modus.</p>}
    </div>
  );
}
