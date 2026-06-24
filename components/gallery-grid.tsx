"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteGalleryPhotoAction } from "@/app/actions/gallery";
import { SubmitButton } from "@/components/submit-button";

type GalleryGridPhoto = {
  id: string;
  signedUrl: string;
  caption: string | null;
};

function DeletePhotoForm({ photoId, compact = false }: { photoId: string; compact?: boolean }) {
  return (
    <form className="photo-delete-form" action={deleteGalleryPhotoAction}>
      <input type="hidden" name="photoId" value={photoId} />
      <SubmitButton
        className={compact ? "photo-delete-button" : "button danger"}
        confirmMessage="Foto wirklich löschen?"
        pendingLabel="Löscht..."
      >
        <Trash2 size={compact ? 16 : 18} />
        {compact ? <span>Löschen</span> : "Foto löschen"}
      </SubmitButton>
    </form>
  );
}

export function GalleryGrid({ photos, isAdmin }: { photos: GalleryGridPhoto[]; isAdmin: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex] || null;
  const hasMany = photos.length > 1;

  useEffect(() => {
    if (selectedIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      }

      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) => (current === null ? current : (current - 1 + photos.length) % photos.length));
      }

      if (event.key === "ArrowRight") {
        setSelectedIndex((current) => (current === null ? current : (current + 1) % photos.length));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, selectedIndex]);

  function showPrevious() {
    setSelectedIndex((current) => (current === null ? current : (current - 1 + photos.length) % photos.length));
  }

  function showNext() {
    setSelectedIndex((current) => (current === null ? current : (current + 1) % photos.length));
  }

  if (!photos.length) {
    return <p className="photo-empty">Noch keine Fotos hochgeladen.</p>;
  }

  return (
    <>
      <section className="photo-grid" aria-label="Galeriefotos">
        {photos.map((photo, index) => (
          <figure className="photo-card" key={photo.id}>
            <button
              className="photo-open-button"
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={photo.caption ? `Foto öffnen: ${photo.caption}` : "Foto öffnen"}
            >
              <div className="photo-frame">
                <Image
                  src={photo.signedUrl}
                  alt={photo.caption || "Galeriefoto"}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
                  unoptimized
                />
                <span className="photo-open-hint">
                  <Maximize2 size={16} />
                  Öffnen
                </span>
              </div>
            </button>
            <figcaption>
              <span>{photo.caption || "Ohne Caption"}</span>
              {isAdmin ? <DeletePhotoForm photoId={photo.id} compact /> : null}
            </figcaption>
          </figure>
        ))}
      </section>

      {selectedPhoto ? (
        <div className="photo-lightbox-backdrop" role="presentation" onClick={() => setSelectedIndex(null)}>
          <div
            className="photo-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.caption || "Galeriefoto"}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="photo-lightbox-close" type="button" onClick={() => setSelectedIndex(null)} aria-label="Foto schließen">
              <X size={24} />
            </button>

            {hasMany ? (
              <>
                <button className="photo-lightbox-nav previous" type="button" onClick={showPrevious} aria-label="Vorheriges Foto">
                  <ChevronLeft size={28} />
                </button>
                <button className="photo-lightbox-nav next" type="button" onClick={showNext} aria-label="Nächstes Foto">
                  <ChevronRight size={28} />
                </button>
              </>
            ) : null}

            <div className="photo-lightbox-image">
              <Image src={selectedPhoto.signedUrl} alt={selectedPhoto.caption || "Galeriefoto"} fill sizes="100vw" unoptimized />
            </div>

            <div className="photo-lightbox-footer">
              <p>{selectedPhoto.caption || "Ohne Caption"}</p>
              {isAdmin ? <DeletePhotoForm photoId={selectedPhoto.id} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
