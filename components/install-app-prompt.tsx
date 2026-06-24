"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Share2, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator && Boolean(navigator.standalone))
  );
}

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneDisplay());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt || isPrompting) return;

    setIsPrompting(true);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setIsPrompting(false);
    setInstallPrompt(null);

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
  }

  return (
    <section className="install-panel" aria-labelledby="install-app-title">
      <div className="install-panel-main">
        <Smartphone size={28} aria-hidden="true" />
        <div>
          <h2 id="install-app-title">Galerie vom Handy vorbereiten</h2>
          <p>
            Installiere die App auf dem Handy und bleib eingeloggt. Danach taucht Gurken beim Teilen von Bildern aus
            der Foto-App als Ziel auf.
          </p>
        </div>
      </div>
      <div className="install-panel-actions">
        {isInstalled ? (
          <span className="install-state">
            <CheckCircle2 size={18} aria-hidden="true" />
            App installiert
          </span>
        ) : installPrompt ? (
          <button className="button primary" type="button" onClick={installApp} disabled={isPrompting}>
            <Download size={18} aria-hidden="true" />
            {isPrompting ? "Öffnet..." : "App installieren"}
          </button>
        ) : (
          <p className="install-fallback">
            Im Browser-Menü <strong>Installieren</strong> oder <strong>Zum Startbildschirm hinzufügen</strong> wählen.
          </p>
        )}
        <a
          className="button secondary"
          href="https://developer.chrome.com/docs/capabilities/web-apis/web-share-target"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={18} aria-hidden="true" />
          Warum?
        </a>
      </div>
      <div className="install-panel-note">
        <Share2 size={18} aria-hidden="true" />
        <span>Mehrfachauswahl in der Foto-App teilen und anschließend Gurken auswählen.</span>
      </div>
    </section>
  );
}
