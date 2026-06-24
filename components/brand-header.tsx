import Image from "next/image";
import Link from "next/link";
import { Beer, CalendarDays, FileText, Images, MapPin, ShieldCheck, Sprout } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

type BrandHeaderProps = {
  isAuthed?: boolean;
  isAdmin?: boolean;
};

export function BrandHeader({ isAuthed = false, isAdmin = false }: BrandHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Image src="/assets/chungus.png" alt="" width={38} height={38} />
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
            <Link href="/datenschutz">
              <FileText size={18} /> Datenschutz
            </Link>
            <form action={signOutAction}>
              <button className="button ghost" type="submit">
                Logout
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/datenschutz">
              <FileText size={18} /> Datenschutz
            </Link>
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
