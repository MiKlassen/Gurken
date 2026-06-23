import { UploadCloud } from "lucide-react";
import { uploadGalleryPhotoAction } from "@/app/actions/gallery";
import { SubmitButton } from "@/components/submit-button";

export function GalleryUpload() {
  return (
    <form className="form-panel upload-panel" action={uploadGalleryPhotoAction}>
      <label>
        Foto reinwerfen
        <input type="file" name="photo" accept="image/*" required />
      </label>
      <label>
        Caption optional
        <input name="caption" maxLength={140} placeholder="Was passiert hier gerade?" />
      </label>
      <SubmitButton pendingLabel="Lädt hoch...">
        <UploadCloud size={18} /> Hochladen
      </SubmitButton>
    </form>
  );
}
