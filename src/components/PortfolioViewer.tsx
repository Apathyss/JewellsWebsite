"use client";

import { useEffect, useState } from "react";
import { Heart, ImageOff, X } from "lucide-react";
import { Button } from "@/components/Button";
import type { PortfolioPhotoWithUrl } from "@/types/gallery";

type Props = {
  photos: PortfolioPhotoWithUrl[];
};

export function PortfolioViewer({ photos }: Props) {
  const [activePhoto, setActivePhoto] = useState<PortfolioPhotoWithUrl | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [likeCounts, setLikeCounts] = useState(() => new Map(photos.map((photo) => [photo.id, photo.likeCount])));
  const [brokenPreviewIds, setBrokenPreviewIds] = useState(() => new Set(photos.filter((photo) => !photo.imageUrl).map((photo) => photo.id)));
  const [savingId, setSavingId] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    const storedClientId = window.localStorage.getItem("portfolio-like-client-id") || crypto.randomUUID();
    window.localStorage.setItem("portfolio-like-client-id", storedClientId);
    setClientId(storedClientId);

    try {
      setLikedIds(new Set(JSON.parse(window.localStorage.getItem("portfolio-likes") || "[]")));
    } catch {
      setLikedIds(new Set());
    }
  }, []);

  async function likePhoto(photo: PortfolioPhotoWithUrl) {
    if (likedIds.has(photo.id) || !clientId) return;

    const nextIds = new Set(likedIds);
    nextIds.add(photo.id);
    setLikedIds(nextIds);
    setLikeCounts((currentCounts) => {
      const nextCounts = new Map(currentCounts);
      nextCounts.set(photo.id, (nextCounts.get(photo.id) || 0) + 1);
      return nextCounts;
    });
    setSavingId(photo.id);

    const response = await fetch("/api/portfolio/likes", {
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

    const payload = (await response.json()) as { likeCount?: number };
    if (typeof payload.likeCount === "number") {
      setLikeCounts((currentCounts) => {
        const nextCounts = new Map(currentCounts);
        nextCounts.set(photo.id, payload.likeCount || 0);
        return nextCounts;
      });
    }

    window.localStorage.setItem("portfolio-likes", JSON.stringify(Array.from(nextIds)));
  }

  if (!photos.length) {
    return (
      <p className="rounded-lg bg-white p-8 text-center leading-7 text-[#52616b] shadow-sm">
        Jewells Portfolio is almost ready. Check back soon for favorite captured moments.
      </p>
    );
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => {
          const isLiked = likedIds.has(photo.id);
          const likeCount = likeCounts.get(photo.id) || 0;
          const title = photo.title || photo.original_filename;

          return (
            <article key={photo.id} className="group overflow-hidden rounded-lg bg-white shadow-sm">
              <button
                type="button"
                className="block w-full overflow-hidden bg-[#f6f8f3]"
                onClick={() => setActivePhoto(photo)}
                aria-label={`Open ${title}`}
                disabled={!photo.imageUrl || brokenPreviewIds.has(photo.id)}
              >
                {photo.imageUrl && !brokenPreviewIds.has(photo.id) ? (
                  <img
                    className="h-auto w-full transition duration-300 group-hover:opacity-90"
                    src={photo.imageUrl}
                    alt={title}
                    onError={() =>
                      setBrokenPreviewIds((currentIds) => {
                        const nextIds = new Set(currentIds);
                        nextIds.add(photo.id);
                        return nextIds;
                      })
                    }
                  />
                ) : (
                  <span className="flex min-h-56 flex-col items-center justify-center gap-2 p-3 text-center text-sm text-[#52616b]">
                    <ImageOff className="text-leaf" size={24} />
                    Preview unavailable
                  </span>
                )}
              </button>
              <div className="grid gap-2 p-3">
                <div>
                  <h2 className="truncate text-sm font-bold text-ink" title={title}>
                    {title}
                  </h2>
                  {photo.category ? <p className="mt-1 text-xs font-semibold text-[#9b5675]">{photo.category}</p> : null}
                </div>
                <button
                  type="button"
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
                    isLiked ? "border-petal bg-petal text-ink" : "border-[#d8ded3] bg-white text-[#52616b] hover:bg-[#f6f8f3]"
                  }`}
                  onClick={() => likePhoto(photo)}
                  disabled={savingId === photo.id || isLiked}
                  aria-label={isLiked ? `${likeCount} likes` : `Like ${title}`}
                >
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  <span>{likeCount}</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {activePhoto ? (
        <div className="fixed inset-0 z-50 grid bg-black/88 p-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activePhoto.title || activePhoto.original_filename}</p>
              {activePhoto.description ? <p className="mt-1 truncate text-xs text-white/75">{activePhoto.description}</p> : null}
            </div>
            <Button type="button" variant="secondary" className="h-11 w-11 shrink-0 p-0" onClick={() => setActivePhoto(null)}>
              <X size={20} />
            </Button>
          </div>
          <div className="flex min-h-0 items-center justify-center">
            <img
              className="max-h-full rounded-lg object-contain"
              src={activePhoto.imageUrl}
              alt={activePhoto.title || activePhoto.original_filename}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
