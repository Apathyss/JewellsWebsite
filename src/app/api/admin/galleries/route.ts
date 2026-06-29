import { NextRequest, NextResponse } from "next/server";
import { generateGalleryCode } from "@/lib/gallery-code";
import { PHOTO_BUCKET, getSiteUrl, requireAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { data: galleries, error } = await admin.supabase
    .from("galleries")
    .select("*, photos(id, storage_path)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const galleriesWithCounts = await Promise.all(
    (galleries || []).map(async (gallery) => {
      const photoRows = gallery.photos || [];
      const { data: storageItems, error: storageError } = await admin.supabase.storage
        .from(PHOTO_BUCKET)
        .list(gallery.gallery_code, { limit: 1000 });

      if (storageError) {
        return {
          ...gallery,
          photoCount: photoRows.length,
          missingPhotoCount: 0,
          photos: undefined
        };
      }

      const storagePaths = new Set((storageItems || []).map((item) => `${gallery.gallery_code}/${item.name}`));
      const availablePhotoCount = photoRows.filter((photo: { storage_path: string }) =>
        storagePaths.has(photo.storage_path)
      ).length;

      return {
        ...gallery,
        photoCount: availablePhotoCount,
        missingPhotoCount: Math.max(photoRows.length - availablePhotoCount, 0),
        photos: undefined
      };
    })
  );

  return NextResponse.json({
    galleries: galleriesWithCounts
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as {
    title?: string;
    clientName?: string;
    clientEmail?: string;
    expiresAt?: string | null;
  };

  if (!body.title?.trim() || !body.clientName?.trim()) {
    return NextResponse.json({ error: "Gallery title and client name are required." }, { status: 400 });
  }

  let galleryCode = generateGalleryCode();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await admin.supabase
      .from("galleries")
      .insert({
        title: body.title.trim(),
        client_name: body.clientName.trim(),
        client_email: body.clientEmail?.trim() || null,
        gallery_code: galleryCode,
        expires_at: body.expiresAt || null
      })
      .select("*")
      .single();

    if (!error && data) {
      return NextResponse.json({
        gallery: data,
        link: `${getSiteUrl()}/g/${data.gallery_code}`
      });
    }

    if (error?.code !== "23505") {
      return NextResponse.json({ error: error?.message || "Could not create gallery." }, { status: 500 });
    }

    galleryCode = generateGalleryCode();
  }

  return NextResponse.json({ error: "Could not generate a unique gallery code." }, { status: 500 });
}
