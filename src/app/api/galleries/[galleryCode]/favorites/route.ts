import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type Params = {
  params: {
    galleryCode: string;
  };
};

async function saveFavorite({
  supabase,
  galleryId,
  photoId,
  clientId
}: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  galleryId: string;
  photoId: string;
  clientId: string;
}) {
  const modernFavorite = {
    gallery_id: galleryId,
    photo_id: photoId,
    client_id: clientId
  };

  const modernResult = await supabase
    .from("favorites")
    .upsert(modernFavorite, { onConflict: "gallery_id,photo_id,client_id", ignoreDuplicates: true });

  if (!modernResult.error) return null;

  const legacyFavorite = {
    gallery_id: galleryId,
    photo_id: photoId
  };

  const legacyResult = await supabase
    .from("favorites")
    .upsert(legacyFavorite, { onConflict: "gallery_id,photo_id", ignoreDuplicates: true });

  if (!legacyResult.error || legacyResult.error.code === "23505") return null;

  const insertResult = await supabase.from("favorites").insert(legacyFavorite);
  if (!insertResult.error || insertResult.error.code === "23505") return null;

  return modernResult.error;
}

export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createServiceSupabaseClient();
  const body = (await request.json()) as { photoId?: string; clientId?: string };

  if (!body.photoId || !body.clientId) {
    return NextResponse.json({ error: "Photo id and client id are required." }, { status: 400 });
  }

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, active, expires_at")
    .eq("gallery_code", params.galleryCode)
    .single();

  if (galleryError || !gallery || !gallery.active) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    return NextResponse.json({ error: "Gallery has expired." }, { status: 410 });
  }

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("id")
    .eq("id", body.photoId)
    .eq("gallery_id", gallery.id)
    .single();

  if (photoError || !photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const error = await saveFavorite({
    supabase,
    galleryId: gallery.id,
    photoId: body.photoId,
    clientId: body.clientId
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count, error: countError } = await supabase
    .from("favorites")
    .select("photo_id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id)
    .eq("photo_id", body.photoId);

  if (countError) return NextResponse.json({ ok: true });

  return NextResponse.json({ ok: true, favoriteCount: count || 0 });
}
