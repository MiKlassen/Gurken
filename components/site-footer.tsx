import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Gurken Treffen</p>
      <nav aria-label="Rechtliches">
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/impressum">Impressum</Link>
        <a href="mailto:michael@klassen.ruhr">Kontakt</a>
      </nav>
    </footer>
  );
}
