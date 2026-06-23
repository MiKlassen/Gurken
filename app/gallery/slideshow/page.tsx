import { BrandHeader } from "@/components/brand-header";
import { Slideshow } from "@/components/slideshow";
import { getActiveEventForMember, listGalleryPhotos, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GallerySlideshowPage() {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const event = await getActiveEventForMember();
  const photos = event ? await listGalleryPhotos(event.id) : [];

  return (
    <main className="slideshow-shell">
      <BrandHeader isAuthed />
      <Slideshow photos={photos} />
    </main>
  );
}
