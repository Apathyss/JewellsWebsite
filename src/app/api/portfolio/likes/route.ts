import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createServiceSupabaseClient();
  const body = (await request.json()) as { photoId?: string; clientId?: string };

  if (!body.photoId || !body.clientId) {
    return NextResponse.json({ error: "Photo id and client id are required." }, { status: 400 });
  }

  const { data: photo, error: photoError } = await supabase
    .from("portfolio_photos")
    .select("id, active")
    .eq("id", body.photoId)
    .eq("active", true)
    .single();

  if (photoError || !photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("portfolio_likes")
    .upsert(
      {
        photo_id: body.photoId,
        client_id: body.clientId
      },
      { onConflict: "photo_id,client_id", ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count, error: countError } = await supabase
    .from("portfolio_likes")
    .select("photo_id", { count: "exact", head: true })
    .eq("photo_id", body.photoId);

  if (countError) return NextResponse.json({ ok: true });

  return NextResponse.json({ ok: true, likeCount: count || 0 });
}
