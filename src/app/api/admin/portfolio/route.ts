import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { data: photos, error } = await admin.supabase
    .from("portfolio_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const photoIds = (photos || []).map((photo) => photo.id);
  const { data: likeRows } = photoIds.length
    ? await admin.supabase.from("portfolio_likes").select("photo_id").in("photo_id", photoIds)
    : { data: [] as { photo_id: string }[] };

  const likeCounts = new Map<string, number>();
  for (const like of likeRows || []) {
    likeCounts.set(like.photo_id, (likeCounts.get(like.photo_id) || 0) + 1);
  }

  const photosWithUrls = await mapWithConcurrency(photos || [], 8, async (photo) => {
    const { data } = await admin.supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 60 * 60);

    return {
      ...photo,
      imageUrl: data?.signedUrl || "",
      likeCount: likeCounts.get(photo.id) || 0
    };
  });

  return NextResponse.json({ photos: photosWithUrls });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const applyDetails = formData.get("applyDetails") === "true";
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "Choose at least one portfolio photo to upload." }, { status: 400 });
  }

  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (!imageFiles.length) {
    return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
  }

  const uploadedRows = await mapWithConcurrency(imageFiles, STORAGE_UPLOAD_CONCURRENCY, async (file) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `portfolio/${crypto.randomUUID()}-${safeName}`;

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
      storage_path: storagePath,
      original_filename: file.name,
      title: applyDetails ? title || null : null,
      category: category || null,
      description: applyDetails ? description || null : null
    };
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "Could not upload portfolio photos.";
    return message;
  });

  if (typeof uploadedRows === "string") {
    return NextResponse.json({ error: uploadedRows }, { status: 500 });
  }

  const { error } = await admin.supabase.from("portfolio_photos").insert(uploadedRows);
  if (error) {
    await admin.supabase.storage.from(PHOTO_BUCKET).remove(uploadedRows.map((row) => row.storage_path));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: uploadedRows.length });
}
