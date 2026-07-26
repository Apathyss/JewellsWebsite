import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

type Params = {
  params: {
    photoId: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as { active?: boolean };

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Active must be true or false." }, { status: 400 });
  }

  const { error } = await admin.supabase
    .from("portfolio_photos")
    .update({ active: body.active })
    .eq("id", params.photoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { data: photo, error: photoError } = await admin.supabase
    .from("portfolio_photos")
    .select("id, storage_path")
    .eq("id", params.photoId)
    .single();

  if (photoError || !photo) {
    return NextResponse.json({ error: "Portfolio photo not found." }, { status: 404 });
  }

  const { error } = await admin.supabase.from("portfolio_photos").delete().eq("id", params.photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);

  return NextResponse.json({ ok: true });
}
