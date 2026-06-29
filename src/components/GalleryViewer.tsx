"use client";

import { useEffect, useState } from "react";
import { Download, Heart, ImageOff, X } from "lucide-react";
import { Button } from "@/components/Button";
import type { Gallery, GalleryPhoto } from "@/types/gallery";

type Props = {
  gallery: Gallery;
  photos: GalleryPhoto[];
};

export function GalleryViewer({ gallery, photos }: Props) {
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [likeCounts, setLikeCounts] = useState(() => new Map(photos.map((photo) => [photo.id, photo.favoriteCount])));
  const [brokenPreviewIds, setBrokenPreviewIds] = useState(() => new Set(photos.filter((photo) => !photo.viewUrl).map((photo) => photo.id)));
  const [savingId, setSavingId] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    const storageKey = `gallery-likes:${gallery.gallery_code}`;
    const visitorKey = "gallery-like-client-id";
    const storedClientId = window.localStorage.getItem(visitorKey) || crypto.randomUUID();
    window.localStorage.setItem(visitorKey, storedClientId);
    setClientId(storedClientId);

    try {
      setLikedIds(new Set(JSON.parse(window.localStorage.getItem(storageKey) || "[]")));
    } catch {
      setLikedIds(new Set());
    }
  }, [gallery.gallery_code]);

  async function likePhoto(photo: GalleryPhoto) {
    if (likedIds.has(photo.id) || !clientId) return;

    const storageKey = `gallery-likes:${gallery.gallery_code}`;
    const nextIds = new Set(likedIds);
    nextIds.add(photo.id);
    setLikedIds(nextIds);
    setLikeCounts((currentCounts) => {
      const nextCounts = new Map(currentCounts);
      nextCounts.set(photo.id, (nextCounts.get(photo.id) || 0) + 1);
      return nextCounts;
    });
    setSavingId(photo.id);

    const response = await fetch(`/api/galleries/${gallery.gallery_code}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoId: photo.id,
        clientId
      })
    });

    setSavingId("");

    if (!response.ok) {
      nextIds.delete(photo.id);
      setLikedIds(new Set(nextIds));
      setLikeCounts((currentCounts) => {
        const nextCounts = new Map(currentCounts);
        nextCounts.set(photo.id, Math.max((nextCounts.get(photo.id) || 1) - 1, 0));
        return nextCounts;
      });
      return;
    }

    const payload = (await response.json()) as { favoriteCount?: number };
    if (typeof payload.favoriteCount === "number") {
      const favoriteCount = payload.favoriteCount;
      setLikeCounts((currentCounts) => {
        const nextCounts = new Map(currentCounts);
        nextCounts.set(photo.id, favoriteCount);
        return nextCounts;
      });
    }

    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(nextIds)));
  }

  return (
    <>
      <main className="min-h-screen px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6 rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-leaf">Creative Images by JC</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-ink">{gallery.title}</h1>
                <p className="mt-1 text-[#52616b]">{gallery.client_name}</p>
              </div>
              {photos.length ? (
                <a
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#285f43]"
                  href={`/api/galleries/${gallery.gallery_code}/download`}
                >
                  <Download size={18} /> Download all
                </a>
              ) : null}
            </div>
          </header>

          {photos.length ? (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => {
                const isLiked = likedIds.has(photo.id);
                const likeCount = likeCounts.get(photo.id) || 0;

                return (
                  <article key={photo.id} className="group overflow-hidden rounded-lg bg-white shadow-sm">
                    <button
                      type="button"
                      className="block aspect-square w-full overflow-hidden bg-[#e9eee5]"
                      onClick={() => setActivePhoto(photo)}
                      aria-label={`Open ${photo.original_filename}`}
                      disabled={!photo.viewUrl || brokenPreviewIds.has(photo.id)}
                    >
                      {photo.viewUrl && !brokenPreviewIds.has(photo.id) ? (
                        <img
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          src={photo.viewUrl}
                          alt={photo.original_filename}
                          onError={() =>
                            setBrokenPreviewIds((currentIds) => {
                              const nextIds = new Set(currentIds);
                              nextIds.add(photo.id);
                              return nextIds;
                            })
                          }
                        />
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-sm text-[#52616b]">
                          <ImageOff className="text-leaf" size={24} />
                          Preview unavailable
                        </span>
                      )}
                    </button>
                    <p className="truncate px-2 pt-2 text-xs text-[#52616b]" title={photo.original_filename}>
                      {photo.original_filename}
                    </p>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <button
                        type="button"
                        className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-2 text-sm font-semibold transition ${
                          isLiked ? "border-petal bg-petal text-ink" : "border-[#d8ded3] bg-white text-[#52616b]"
                        }`}
                        onClick={() => likePhoto(photo)}
                        disabled={savingId === photo.id || isLiked}
                        aria-label={isLiked ? `${likeCount} likes` : `Like ${photo.original_filename}`}
                      >
                        <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                        <span>+{likeCount}</span>
                      </button>
                      <a
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d8ded3] bg-white text-[#52616b] transition hover:bg-[#f6f8f3]"
                        href={photo.downloadUrl}
                        aria-label={`Download ${photo.original_filename}`}
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <p className="rounded-lg bg-white p-8 text-center text-[#52616b] shadow-sm">
              This gallery does not have photos yet.
            </p>
          )}
        </div>
      </main>

      {activePhoto ? (
        <div className="fixed inset-0 z-50 grid bg-black/88 p-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-white">
            <p className="truncate text-sm">{activePhoto.original_filename}</p>
            <div className="flex gap-2">
              <a
                className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white text-ink"
                href={activePhoto.downloadUrl}
                aria-label="Download photo"
              >
                <Download size={19} />
              </a>
              <Button type="button" variant="secondary" className="h-11 w-11 p-0" onClick={() => setActivePhoto(null)}>
                <X size={20} />
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 items-center justify-center">
            <img
              className="max-h-full rounded-lg object-contain"
              src={activePhoto.viewUrl}
              alt={activePhoto.original_filename}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
