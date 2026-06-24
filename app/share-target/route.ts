import { NextResponse } from "next/server";
import { uploadGalleryPhotos } from "@/lib/gallery-upload";

export const dynamic = "force-dynamic";

function redirectToGallery(request: Request, params: Record<string, string>) {
  const url = new URL("/gallery", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  return redirectToGallery(request, {});
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await uploadGalleryPhotos(formData);

  if (!result.ok) {
    return redirectToGallery(request, { error: result.message });
  }

  return redirectToGallery(request, { message: result.message });
}
