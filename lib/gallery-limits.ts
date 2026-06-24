export const MAX_GALLERY_PHOTO_SIZE = 10 * 1024 * 1024;
export const MAX_GALLERY_PHOTO_COUNT = 20;
export const MAX_GALLERY_UPLOAD_SIZE = 24 * 1024 * 1024;

export function formatMegabytes(bytes: number) {
  return `${Math.floor(bytes / 1024 / 1024)} MB`;
}
