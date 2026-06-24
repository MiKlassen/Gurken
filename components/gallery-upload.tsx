import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { uploadGalleryPhotoAction } from "@/app/actions/gallery";
import { SubmitButton } from "@/components/submit-button";

export function GalleryUpload() {
  return (
    <form className="form-panel upload-panel" action={uploadGalleryPhotoAction}>
      <label>
        Fotos reinwerfen
        <input type="file" name="photos" accept="image/*" multiple required />
      </label>
      <label>
        Caption optional für alle ausgewählten Fotos
        <input name="caption" maxLength={140} placeholder="Was passiert hier gerade?" />
      </label>
      <SubmitButton pendingLabel="Lädt hoch...">
        <UploadCloud size={18} /> Fotos hochladen
      </SubmitButton>
      <p className="legal-note">
        Lade nur Fotos hoch, die im Mitgliederkreis gezeigt werden dürfen. Details stehen in der{" "}
        <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </form>
  );
}
