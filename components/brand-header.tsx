import Image from "next/image";
import Link from "next/link";
import { Beer, CalendarDays, Images, MapPin, Menu, ShieldCheck, Sprout, X } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

type BrandHeaderProps = {
  isAuthed?: boolean;
  isAdmin?: boolean;
};

function NavItems({ isAuthed, isAdmin }: BrandHeaderProps) {
  if (!isAuthed) {
    return (
      <>
        <Link href="/auth/login">Login</Link>
        <Link className="button small primary" href="/auth/register">
          <Beer size={16} /> Registrieren
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard">
        <Sprout size={18} /> Bereich
      </Link>
      <Link href="/book">
        <CalendarDays size={18} /> Buchung
      </Link>
      <Link href="/location">
        <MapPin size={18} /> Ort
      </Link>
      <Link href="/gallery">
        <Images size={18} /> Galerie
      </Link>
      {isAdmin ? (
        <Link href="/admin">
          <ShieldCheck size={18} /> Admin
        </Link>
      ) : null}
      <form action={signOutAction}>
        <button className="button ghost" type="submit">
          Logout
        </button>
      </form>
    </>
  );
}

export function BrandHeader({ isAuthed = false, isAdmin = false }: BrandHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Image src="/assets/chungus.png" alt="" width={38} height={38} />
        <span>Gurken Treffen</span>
      </Link>

      <input className="nav-toggle-input" type="checkbox" id="site-nav-toggle" aria-hidden="true" />
      <label className="nav-toggle-button" htmlFor="site-nav-toggle" aria-label="Navigation öffnen">
        <Menu size={22} />
      </label>

      <nav className="nav-links desktop-nav" aria-label="Hauptnavigation">
        <NavItems isAuthed={isAuthed} isAdmin={isAdmin} />
      </nav>

      <label className="drawer-backdrop" htmlFor="site-nav-toggle" aria-hidden="true" />
      <aside className="mobile-nav-drawer" aria-label="Mobile Navigation">
        <div className="drawer-head">
          <Link className="brand" href="/">
            <Image src="/assets/chungus.png" alt="" width={38} height={38} />
            <span>Gurken Treffen</span>
          </Link>
          <label className="drawer-close" htmlFor="site-nav-toggle" aria-label="Navigation schließen">
            <X size={22} />
          </label>
        </div>
        <nav className="drawer-links" aria-label="Mobile Hauptnavigation">
          <NavItems isAuthed={isAuthed} isAdmin={isAdmin} />
        </nav>
      </aside>
    </header>
  );
}
