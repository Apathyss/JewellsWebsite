import { NextRequest, NextResponse } from "next/server";
import { createZip } from "@/lib/zip";
import { PHOTO_BUCKET, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Gallery, Photo } from "@/types/gallery";

type Params = {
  params: {
    galleryCode: string;
  };
};

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = createServiceSupabaseClient();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("*")
    .eq("gallery_code", params.galleryCode)
    .eq("active", true)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    return NextResponse.json({ error: "Gallery expired." }, { status: 404 });
  }

  const { data: photos, error: photoError } = await supabase
    .from("photos")
    .select("*")
    .eq("gallery_id", gallery.id)
    .order("created_at", { ascending: true })
    .returns<Photo[]>();

  if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 });
  if (!photos?.length) return NextResponse.json({ error: "No photos to download." }, { status: 404 });

  const zipFiles = [];

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(photo.storage_path);
    if (error || !data) return NextResponse.json({ error: error?.message || "Could not download photo." }, { status: 500 });

    zipFiles.push({
      name: `${String(index + 1).padStart(2, "0")}-${photo.original_filename}`,
      data: new Uint8Array(await data.arrayBuffer())
    });
  }

  const zip = createZip(zipFiles);
  const fileName = `${gallery.gallery_code}-photos.zip`;

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
