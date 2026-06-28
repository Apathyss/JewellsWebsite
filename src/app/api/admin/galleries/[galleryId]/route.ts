import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

type Params = {
  params: {
    galleryId: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as { active?: boolean; expires_at?: string | null };
  const updates: Record<string, unknown> = {};

  if (typeof body.active === "boolean") updates.active = body.active;
  if ("expires_at" in body) updates.expires_at = body.expires_at;

  const { data, error } = await admin.supabase
    .from("galleries")
    .update(updates)
    .eq("id", params.galleryId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gallery: data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { data: photos, error: photosError } = await admin.supabase
    .from("photos")
    .select("storage_path")
    .eq("gallery_id", params.galleryId);

  if (photosError) return NextResponse.json({ error: photosError.message }, { status: 500 });

  const paths = (photos || []).map((photo) => photo.storage_path);
  if (paths.length) {
    await admin.supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }

  const { error } = await admin.supabase.from("galleries").delete().eq("id", params.galleryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
