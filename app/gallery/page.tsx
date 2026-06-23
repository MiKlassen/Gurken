import Link from "next/link";
import { Images } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { GalleryUpload } from "@/components/gallery-upload";
import { getActiveEventForMember, listGalleryPhotos, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const event = await getActiveEventForMember();
  const photos = event ? await listGalleryPhotos(event.id) : [];

  return (
    <main className="app-shell">
      <BrandHeader isAuthed />
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
      <GalleryUpload />
      <section className="photo-grid">
        {photos.map((photo) => (
          <figure key={photo.id}>
            <img src={photo.signedUrl} alt={photo.caption || "Galeriefoto"} loading="lazy" />
            {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
          </figure>
        ))}
      </section>
    </main>
  );
}
