import { BrandHeader } from "@/components/brand-header";
import { Slideshow } from "@/components/slideshow";
import { getActiveEventForMember, getIsAdmin, listGalleryPhotos, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GallerySlideshowPage() {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const [isAdmin, event] = await Promise.all([getIsAdmin(user.id, user.email), getActiveEventForMember()]);
  const photos = event ? await listGalleryPhotos(event.id) : [];

  return (
    <main className="slideshow-shell">
      <BrandHeader isAuthed isAdmin={isAdmin} />
      <Slideshow photos={photos} />
    </main>
  );
}
