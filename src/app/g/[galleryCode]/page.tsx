import { notFound } from "next/navigation";
import { GalleryViewer } from "@/components/GalleryViewer";
import { PHOTO_BUCKET, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Gallery, GalleryPhoto, Photo } from "@/types/gallery";

type PageProps = {
  params: {
    galleryCode: string;
  };
};

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

export const dynamic = "force-dynamic";

export default async function ClientGalleryPage({ params }: PageProps) {
  const supabase = createServiceSupabaseClient();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("*")
    .eq("gallery_code", params.galleryCode)
    .eq("active", true)
    .single<Gallery>();

  if (galleryError || !gallery) notFound();

  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    notFound();
  }

  const { data: photoRows, error: photoError } = await supabase
    .from("photos")
    .select("*")
    .eq("gallery_id", gallery.id)
    .order("created_at", { ascending: true })
    .returns<Photo[]>();

  if (photoError) {
    throw new Error(photoError.message);
  }

  const { data: favoriteRows } = await supabase
    .from("favorites")
    .select("photo_id")
    .eq("gallery_id", gallery.id);

  const favoriteCounts = new Map<string, number>();
  for (const favorite of favoriteRows || []) {
    favoriteCounts.set(favorite.photo_id, (favoriteCounts.get(favorite.photo_id) || 0) + 1);
  }

  const photosWithUrls: GalleryPhoto[] = await mapWithConcurrency(
    photoRows || [],
    SIGNED_URL_CONCURRENCY,
    async (photo) => {
      const [{ data: viewData }, { data: downloadData }] = await Promise.all([
        supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 60 * 60),
        supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 60 * 60, {
          download: photo.original_filename
        })
      ]);

      return {
        ...photo,
        viewUrl: viewData?.signedUrl || "",
        downloadUrl: downloadData?.signedUrl || "",
        favoriteCount: favoriteCounts.get(photo.id) || 0
      };
    }
  );

  return <GalleryViewer gallery={gallery} photos={photosWithUrls} />;
}
