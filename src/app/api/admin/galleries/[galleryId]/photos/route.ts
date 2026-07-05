import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

type Params = {
  params: {
    galleryId: string;
  };
};

const STORAGE_UPLOAD_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

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

  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (!imageFiles.length) {
    return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
  }

  const uploadedRows = await mapWithConcurrency(imageFiles, STORAGE_UPLOAD_CONCURRENCY, async (file) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${gallery.gallery_code}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await admin.supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    return {
      gallery_id: gallery.id,
      storage_path: storagePath,
      original_filename: file.name
    };
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "Could not upload photos.";
    return message;
  });

  if (typeof uploadedRows === "string") {
    return NextResponse.json({ error: uploadedRows }, { status: 500 });
  }

  const { error } = await admin.supabase.from("photos").insert(uploadedRows);
  if (error) {
    await admin.supabase.storage.from(PHOTO_BUCKET).remove(uploadedRows.map((row) => row.storage_path));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: uploadedRows.length });
}
