import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

type Params = {
  params: {
    photoId: string;
  };
};

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { data: photo, error: photoError } = await admin.supabase
    .from("photos")
    .select("storage_path")
    .eq("id", params.photoId)
    .single();

  if (photoError || !photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  await admin.supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  const { error } = await admin.supabase.from("photos").delete().eq("id", params.photoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
