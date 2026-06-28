"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ImagePlus, LogOut, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/format";
import type { Gallery } from "@/types/gallery";

type GalleryWithCount = Gallery & { photoCount: number };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [galleries, setGalleries] = useState<GalleryWithCount[]>([]);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedGalleryId, setSelectedGalleryId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const siteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}, accessToken = token) => {
    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    });
  }, [token]);

  const loadGalleries = useCallback(async (accessToken = token) => {
    setLoading(true);
    const response = await apiFetch("/api/admin/galleries", {}, accessToken);

    if (response.status === 401 || response.status === 403) {
      router.replace("/admin/login");
      return;
    }

    const payload = (await response.json()) as { galleries: GalleryWithCount[] };
    setGalleries(payload.galleries || []);
    setSelectedGalleryId((current) => current || payload.galleries?.[0]?.id || "");
    setLoading(false);
  }, [apiFetch, router, token]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.access_token) {
        router.replace("/admin/login");
        return;
      }

      setToken(data.session.access_token);
      loadGalleries(data.session.access_token);
    });
  }, [loadGalleries, router]);

  async function createGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const response = await apiFetch("/api/admin/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        clientName,
        clientEmail,
        expiresAt: expiresAt || null
      })
    });

    const payload = await response.json();
    setWorking(false);

    if (!response.ok) {
      setMessage(payload.error || "Could not create gallery.");
      return;
    }

    setTitle("");
    setClientName("");
    setClientEmail("");
    setExpiresAt("");
    setSelectedGalleryId(payload.gallery.id);
    setMessage("Gallery created. You can upload photos now.");
    await loadGalleries();
  }

  async function uploadPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGalleryId || !selectedFiles?.length) return;

    setWorking(true);
    setMessage("");
    const body = new FormData();
    Array.from(selectedFiles).forEach((file) => body.append("photos", file));

    const response = await apiFetch(`/api/admin/galleries/${selectedGalleryId}/photos`, {
      method: "POST",
      body
    });
    const payload = await response.json();
    setWorking(false);

    if (!response.ok) {
      setMessage(payload.error || "Could not upload photos.");
      return;
    }

    setSelectedFiles(null);
    setMessage(`Uploaded ${payload.count} photo${payload.count === 1 ? "" : "s"}.`);
    await loadGalleries();
  }

  async function toggleActive(gallery: GalleryWithCount) {
    const response = await apiFetch(`/api/admin/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !gallery.active })
    });

    if (response.ok) await loadGalleries();
  }

  async function deleteGallery(gallery: GalleryWithCount) {
    if (!confirm(`Delete "${gallery.title}" and its photos? This cannot be undone.`)) return;

    const response = await apiFetch(`/api/admin/galleries/${gallery.id}`, {
      method: "DELETE"
    });

    if (response.ok) {
      setMessage("Gallery deleted.");
      setSelectedGalleryId("");
      await loadGalleries();
    }
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  function copyLink(code: string) {
    const link = `${siteUrl}/g/${code}`;
    navigator.clipboard.writeText(link);
    setMessage("Private gallery link copied.");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(event.target.files);
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-leaf">Dustin Photo Sessions</p>
            <h1 className="text-3xl font-bold text-ink">Admin dashboard</h1>
          </div>
          <Button type="button" variant="secondary" onClick={signOut}>
            <LogOut size={18} /> Sign out
          </Button>
        </header>

        <div className="mb-6 rounded-lg border border-petal bg-white p-4 text-sm leading-6 text-[#52616b]">
          Keep galleries private and only upload photos you have permission to share. Private links are hard to
          guess, but anyone with the link can view that gallery.
        </div>

        {message ? <p className="mb-6 rounded-md bg-white p-3 text-sm text-leaf shadow-sm">{message}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <form onSubmit={createGallery} className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-ink">Create gallery</h2>
              <div className="grid gap-4">
                <Field label="Gallery title" value={title} onChange={(event) => setTitle(event.target.value)} required />
                <Field
                  label="Client name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  required
                />
                <Field
                  label="Client email (optional)"
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                />
                <Field
                  label="Expiry date (optional)"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
                <Button type="submit" disabled={working}>
                  {working ? "Working..." : "Create private gallery"}
                </Button>
              </div>
            </form>

            <form onSubmit={uploadPhotos} className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-ink">Upload photos</h2>
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-ink">
                  Gallery
                  <select
                    className="min-h-11 rounded-md border border-[#d8ded3] bg-white px-3 py-2"
                    value={selectedGalleryId}
                    onChange={(event) => setSelectedGalleryId(event.target.value)}
                  >
                    <option value="">Choose a gallery</option>
                    {galleries.map((gallery) => (
                      <option key={gallery.id} value={gallery.id}>
                        {gallery.title} - {gallery.client_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid cursor-pointer gap-3 rounded-lg border border-dashed border-[#cbd5c0] bg-[#fbfdf8] p-5 text-center text-sm text-[#52616b]">
                  <ImagePlus className="mx-auto text-leaf" />
                  <span>{selectedFiles?.length ? `${selectedFiles.length} selected` : "Choose multiple photos"}</span>
                  <input className="sr-only" type="file" accept="image/*" multiple onChange={onFileChange} />
                </label>
                <Button type="submit" disabled={working || !selectedGalleryId || !selectedFiles?.length}>
                  <Upload size={18} /> Upload selected photos
                </Button>
              </div>
            </form>
          </div>

          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-ink">Galleries</h2>
            {loading ? <p className="text-[#52616b]">Loading galleries...</p> : null}
            <div className="grid gap-3">
              {galleries.map((gallery) => (
                <article key={gallery.id} className="rounded-lg border border-[#e4e8df] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-ink">{gallery.title}</h3>
                      <p className="text-sm text-[#52616b]">
                        {gallery.client_name} {gallery.client_email ? `- ${gallery.client_email}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-[#52616b]">
                        {gallery.photoCount} photos - {gallery.active ? "Active" : "Inactive"} - Expires{" "}
                        {formatDate(gallery.expires_at)}
                      </p>
                      <p className="mt-2 break-all rounded-md bg-[#f6f8f3] px-3 py-2 text-sm text-[#52616b]">
                        {siteUrl}/g/{gallery.gallery_code}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => copyLink(gallery.gallery_code)}>
                        <Copy size={16} /> Copy
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => toggleActive(gallery)}>
                        {gallery.active ? "Make inactive" : "Make active"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => deleteGallery(gallery)}>
                        <Trash2 size={16} /> Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
              {!loading && galleries.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#d8ded3] p-6 text-center text-[#52616b]">
                  No galleries yet. Create the first one and upload a few photos.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
