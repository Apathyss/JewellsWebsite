import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type Params = {
  params: {
    galleryCode: string;
  };
};

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

  const { error } = await supabase.from("favorites").upsert(
    {
      gallery_id: gallery.id,
      photo_id: body.photoId,
      client_id: body.clientId
    },
    { onConflict: "gallery_id,photo_id,client_id", ignoreDuplicates: true }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count, error: countError } = await supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id)
    .eq("photo_id", body.photoId);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  return NextResponse.json({ ok: true, favoriteCount: count || 0 });
}
