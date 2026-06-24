import Link from "next/link";
import { Images } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { GalleryGrid } from "@/components/gallery-grid";
import { GalleryUpload } from "@/components/gallery-upload";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import { getActiveEventForMember, getIsAdmin, listGalleryPhotos, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const [params, isAdmin, event] = await Promise.all([searchParams, getIsAdmin(user.id, user.email), getActiveEventForMember()]);
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const photos = event ? await listGalleryPhotos(event.id) : [];

  return (
    <main className="app-shell">
      <BrandHeader isAuthed isAdmin={isAdmin} />
      <section className="page-heading spread">
        <div>
          <Images size={34} />
          <h1>Live-Galerie</h1>
          <p>Alles, was hier hochgeladen wird, ist direkt sichtbar.</p>
        </div>
        <Link className="button secondary" href="/gallery/slideshow">
          Slideshow
        </Link>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice success">{message}</p> : null}
      <InstallAppPrompt />
      <GalleryUpload />
      <GalleryGrid photos={photos} isAdmin={isAdmin} />
    </main>
  );
}
