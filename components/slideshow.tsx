"use client";

import { useEffect, useState } from "react";

type Slide = {
  id: string;
  signedUrl: string;
  caption: string | null;
};

export function Slideshow({ photos }: { photos: Slide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [photos.length]);

  if (!photos.length) {
    return <div className="slideshow-empty">Noch keine Fotos. Erstes Handy gewinnt.</div>;
  }

  const photo = photos[index] || photos[0];

  return (
    <div className="slideshow-stage">
      <img src={photo.signedUrl} alt={photo.caption || "Galeriefoto"} />
      {photo.caption ? <p>{photo.caption}</p> : null}
    </div>
  );
}
