import { unstable_noStore as noStore } from "next/cache";
import { PHOTO_BUCKET, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PortfolioPhoto, PortfolioPhotoWithUrl } from "@/types/gallery";

const SIGNED_URL_CONCURRENCY = 8;

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

export async function getPortfolioPhotos({ limit }: { limit?: number } = {}) {
  noStore();

  try {
    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from("portfolio_photos")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .returns<PortfolioPhoto[]>();

    if (limit) query = query.limit(limit);

    const { data: photoRows, error: photoError } = await query;
    if (photoError) return [];

    const photoIds = (photoRows || []).map((photo) => photo.id);
    const { data: likeRows } = photoIds.length
      ? await supabase.from("portfolio_likes").select("photo_id").in("photo_id", photoIds)
      : { data: [] as { photo_id: string }[] };

    const likeCounts = new Map<string, number>();
    for (const like of likeRows || []) {
      likeCounts.set(like.photo_id, (likeCounts.get(like.photo_id) || 0) + 1);
    }

    return mapWithConcurrency(photoRows || [], SIGNED_URL_CONCURRENCY, async (photo) => {
      const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 60 * 60);

      return {
        ...photo,
        imageUrl: data?.signedUrl || "",
        likeCount: likeCounts.get(photo.id) || 0
      };
    }) satisfies Promise<PortfolioPhotoWithUrl[]>;
  } catch {
    return [];
  }
}
