"use client";

import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { uploadGalleryPhotoAction } from "@/app/actions/gallery";
import { SubmitButton } from "@/components/submit-button";
import {
  formatMegabytes,
  MAX_GALLERY_PHOTO_COUNT,
  MAX_GALLERY_PHOTO_SIZE,
  MAX_GALLERY_UPLOAD_SIZE
} from "@/lib/gallery-limits";

function validateFiles(fileList: FileList | null) {
  const files = Array.from(fileList ?? []);
  if (!files.length) return "Bitte mindestens ein Foto auswählen.";
  if (files.length > MAX_GALLERY_PHOTO_COUNT) {
    return `Bitte maximal ${MAX_GALLERY_PHOTO_COUNT} Fotos gleichzeitig hochladen.`;
  }

  const unsupported = files.find((file) => !file.type.startsWith("image/"));
  if (unsupported) return "Nur Bilddateien sind erlaubt.";

  const tooLarge = files.find((file) => file.size > MAX_GALLERY_PHOTO_SIZE);
  if (tooLarge) return `Ein Foto ist größer als ${formatMegabytes(MAX_GALLERY_PHOTO_SIZE)}.`;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_GALLERY_UPLOAD_SIZE) {
    return `Bitte maximal ${formatMegabytes(MAX_GALLERY_UPLOAD_SIZE)} pro Upload auswählen.`;
  }

  return null;
}

export function GalleryUpload() {
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(validateFiles(event.currentTarget.files));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("photos");
    if (!(input instanceof HTMLInputElement)) return;

    const message = validateFiles(input.files);
    if (message) {
      event.preventDefault();
      setError(message);
      return;
    }

    setError(null);
  }

  return (
    <form className="form-panel upload-panel" action={uploadGalleryPhotoAction} onSubmit={handleSubmit}>
      <label>
        Fotos reinwerfen
        <input type="file" name="photos" accept="image/*" multiple required onChange={handleFileChange} />
      </label>
      {error ? (
        <p className="upload-error" role="alert">
          {error}
        </p>
      ) : null}
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
