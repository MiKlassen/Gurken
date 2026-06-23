import Link from "next/link";
import { Beer, CalendarDays, Images, ShieldCheck, Sprout } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

type BrandHeaderProps = {
  isAuthed?: boolean;
  isAdmin?: boolean;
};

export function BrandHeader({ isAuthed = false, isAdmin = false }: BrandHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <img src="/assets/chungus.png" alt="" />
        <span>Gurken Treffen</span>
      </Link>
      <nav className="nav-links" aria-label="Hauptnavigation">
        {isAuthed ? (
          <>
            <Link href="/dashboard">
              <Sprout size={18} /> Bereich
            </Link>
            <Link href="/book">
              <CalendarDays size={18} /> Buchung
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
        ) : (
          <>
            <Link href="/auth/login">Login</Link>
            <Link className="button small primary" href="/auth/register">
              <Beer size={16} /> Registrieren
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
