import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

type Params = {
  params: {
    galleryId: string;
  };
};

export async function POST(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { data: gallery, error: galleryError } = await admin.supabase
    .from("galleries")
    .select("id, gallery_code")
    .eq("id", params.galleryId)
    .single();

  if (galleryError || !gallery) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "Choose at least one photo to upload." }, { status: 400 });
  }

  const uploadedRows = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${gallery.gallery_code}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await admin.supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    uploadedRows.push({
      gallery_id: gallery.id,
      storage_path: storagePath,
      original_filename: file.name
    });
  }

  if (!uploadedRows.length) {
    return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
  }

  const { error } = await admin.supabase.from("photos").insert(uploadedRows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: uploadedRows.length });
}
