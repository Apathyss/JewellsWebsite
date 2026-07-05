"use client";

import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Copy, ImagePlus, LogOut, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { formatDate } from "@/lib/format";
import type { Gallery } from "@/types/gallery";
import type { Order } from "@/types/order";

type GalleryWithCount = Gallery & { photoCount: number; missingPhotoCount?: number };
type UploadPhase = "idle" | "optimizing" | "sending" | "processing";

const OPTIMIZED_IMAGE_MAX_DIMENSION = 2200;
const OPTIMIZED_IMAGE_QUALITY = 0.82;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [galleries, setGalleries] = useState<GalleryWithCount[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedGalleryId, setSelectedGalleryId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [optimizeUploads, setOptimizeUploads] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadOrders = useCallback(async (accessToken = token) => {
    setOrdersLoading(true);
    const response = await apiFetch("/api/admin/orders", {}, accessToken);

    if (response.status === 401 || response.status === 403) {
      router.replace("/admin/login");
      return;
    }

    const payload = (await response.json()) as { orders: Order[] };
    setOrders(payload.orders || []);
    setOrdersLoading(false);
  }, [apiFetch, router, token]);

  useEffect(() => {
    const accessToken = window.localStorage.getItem("adminAccessToken");
    if (!accessToken) {
      router.replace("/admin/login");
      return;
    }

    setToken(accessToken);
    loadGalleries(accessToken);
    loadOrders(accessToken);
  }, [loadGalleries, loadOrders, router]);

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

  async function createGalleryFromOrder(order: Order) {
    setWorking(true);
    setMessage("");

    const response = await apiFetch("/api/admin/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${order.name} Shoots`,
        clientName: order.name,
        clientEmail: order.email,
        expiresAt: null
      })
    });

    const payload = await response.json();
    setWorking(false);

    if (!response.ok) {
      setMessage(payload.error || "Could not create gallery from order.");
      return;
    }

    setSelectedGalleryId(payload.gallery.id);
    setMessage(`Gallery created for ${order.name}.`);
    await loadGalleries();
  }

  async function uploadPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGalleryId || selectedFiles.length === 0) return;

    setWorking(true);
    setMessage("");
    setUploadProgress(0);

    let uploadFiles = selectedFiles;
    if (optimizeUploads) {
      setUploadPhase("optimizing");
      const optimizedFiles = [];

      try {
        for (let index = 0; index < selectedFiles.length; index += 1) {
          optimizedFiles.push(await optimizeImageFile(selectedFiles[index]));
          setUploadProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
        }
      } catch (error) {
        setWorking(false);
        setUploadPhase("idle");
        setUploadProgress(0);
        setMessage(error instanceof Error ? error.message : "Could not optimize photos.");
        return;
      }

      uploadFiles = optimizedFiles;
    }

    setUploadProgress(0);
    setUploadPhase("sending");
    const body = new FormData();
    uploadFiles.forEach((file) => body.append("photos", file));

    const { ok, payload } = await new Promise<{ ok: boolean; payload: { count?: number; error?: string } }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/admin/galleries/${selectedGalleryId}/photos`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) return;

        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setUploadProgress(progress);
        if (progress >= 100) setUploadPhase("processing");
      };

      xhr.onload = () => {
        let payload: { count?: number; error?: string } = {};
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = {};
        }

        resolve({ ok: xhr.status >= 200 && xhr.status < 300, payload });
      };

      xhr.onerror = () => resolve({ ok: false, payload: { error: "Upload failed. Check your connection and try again." } });
      xhr.send(body);
    });

    setWorking(false);
    setUploadPhase("idle");

    if (!ok) {
      setMessage(payload.error || "Could not upload photos.");
      setUploadProgress(0);
      return;
    }

    setSelectedFiles([]);
    setUploadProgress(100);
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
    window.localStorage.removeItem("adminAccessToken");
    router.replace("/admin/login");
  }

  function copyLink(code: string) {
    const link = `${siteUrl}/g/${code}`;
    navigator.clipboard.writeText(link);
    setMessage("Private gallery link copied.");
  }

  function addFiles(files: File[]) {
    const incomingFiles = files.filter((file) => file.type.startsWith("image/"));
    if (incomingFiles.length === 0 || working) return;

    setSelectedFiles((currentFiles) => {
      const existingFileKeys = new Set(
        currentFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
      );
      const newFiles = incomingFiles.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        return !existingFileKeys.has(key);
      });

      return [...currentFiles, ...newFiles];
    });
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));

    event.target.value = "";
  }

  function onPhotoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function removeSelectedFile(fileToRemove: File) {
    if (working) return;
    setSelectedFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
  }

  const selectedUploadSize = useMemo(
    () => selectedFiles.reduce((totalBytes, file) => totalBytes + file.size, 0),
    [selectedFiles]
  );

  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 MB";
    const megabytes = bytes / 1024 / 1024;
    if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
    return `${(megabytes / 1024).toFixed(1)} GB`;
  }

  function formatSubmittedDate(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-leaf">Creative Images by JC</p>
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
                <div
                  className="grid gap-3 rounded-lg border border-dashed border-[#cbd5c0] bg-[#fbfdf8] p-5 text-center text-sm text-[#52616b]"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onPhotoDrop}
                >
                  <ImagePlus className="mx-auto text-leaf" />
                  <span>{selectedFiles.length ? `${selectedFiles.length} selected` : "Add photos or drag them here"}</span>
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={working}>
                    Add photos
                  </Button>
                  <input
                    ref={fileInputRef}
                    className="sr-only"
                    type="file"
                    name="photos"
                    accept="image/*"
                    multiple={true}
                    onChange={onFileChange}
                  />
                </div>
                {selectedFiles.length ? (
                  <div className="grid gap-2 rounded-md bg-[#f6f8f3] p-3 text-sm text-[#52616b]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ink">
                        {selectedFiles.length} photo{selectedFiles.length === 1 ? "" : "s"} ready -{" "}
                        {formatFileSize(selectedUploadSize)}
                      </span>
                      <Button type="button" variant="secondary" onClick={() => setSelectedFiles([])} disabled={working}>
                        Clear
                      </Button>
                    </div>
                    <div className="grid max-h-36 gap-2 overflow-auto">
                      {selectedFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#52616b] transition hover:bg-[#eef3e9] hover:text-ink"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeSelectedFile(file)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {working && uploadPhase !== "idle" ? (
                  <div className="grid gap-2 rounded-md border border-[#d8ded3] bg-white p-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                      <span>
                        {uploadPhase === "optimizing"
                          ? "Optimizing photos"
                          : uploadPhase === "sending"
                            ? "Uploading photos"
                            : "Finishing upload"}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#e7ece2]">
                      <div
                        className="h-full rounded-full bg-leaf transition-[width] duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs leading-5 text-[#52616b]">
                      {uploadPhase === "optimizing"
                        ? "Making smaller upload copies to save storage."
                        : uploadPhase === "sending"
                          ? "Sending files from your browser."
                          : "Files reached the site. Saving them to private storage now."}
                    </p>
                  </div>
                ) : null}
                <label className="flex items-start gap-3 rounded-md bg-[#f6f8f3] p-3 text-sm text-[#52616b]">
                  <input
                    className="mt-1 h-4 w-4 accent-leaf"
                    type="checkbox"
                    checked={optimizeUploads}
                    onChange={(event) => setOptimizeUploads(event.target.checked)}
                    disabled={working}
                  />
                  <span>
                    <span className="block font-semibold text-ink">Optimize photos before upload</span>
                    <span className="block leading-5">
                      Saves storage and uploads faster. Turn this off when you need full-size originals.
                    </span>
                  </span>
                </label>
                <Button type="submit" disabled={working || !selectedGalleryId || selectedFiles.length === 0}>
                  <Upload size={18} /> Upload selected photos
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="text-leaf" size={20} />
                <h2 className="text-xl font-bold text-ink">Orders</h2>
              </div>
              {ordersLoading ? <p className="text-[#52616b]">Loading orders...</p> : null}
              <div className="grid gap-3">
                {orders.map((order) => (
                  <article key={order.id} className="rounded-lg border border-[#e4e8df] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-ink">{order.name}</h3>
                          <span className="rounded-full bg-petal px-2 py-0.5 text-xs font-semibold text-ink">
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#52616b]">
                          {order.email}
                          {order.phone ? ` - ${order.phone}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-[#52616b]">
                          {order.session_type || "Session"} - Preferred date {formatDate(order.preferred_date)}
                        </p>
                        {order.location ? <p className="mt-1 text-sm text-[#52616b]">{order.location}</p> : null}
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <p className="text-sm text-[#52616b]">{formatSubmittedDate(order.created_at)}</p>
                        <Button type="button" variant="secondary" onClick={() => createGalleryFromOrder(order)} disabled={working}>
                          Create gallery
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-md bg-[#f6f8f3] px-3 py-2 text-sm leading-6 text-[#52616b]">
                      {order.message}
                    </p>
                  </article>
                ))}
                {!ordersLoading && orders.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#d8ded3] p-6 text-center text-[#52616b]">
                    No orders yet. New website orders will appear here.
                  </p>
                ) : null}
              </div>
            </section>

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
                          {gallery.photoCount} photos
                          {gallery.missingPhotoCount ? ` - ${gallery.missingPhotoCount} missing files` : ""} -{" "}
                          {gallery.active ? "Active" : "Inactive"} - Expires{" "}
                          {formatDate(gallery.expires_at)}
                        </p>
                        <a
                          className="mt-2 block break-all rounded-md bg-[#f6f8f3] px-3 py-2 text-sm font-semibold text-leaf transition hover:bg-[#eef3e9]"
                          href={`${siteUrl}/g/${gallery.gallery_code}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {siteUrl}/g/{gallery.gallery_code}
                        </a>
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
      </div>
    </main>
  );
}

async function optimizeImageFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;

  const image = await loadImage(file);
  const scale = Math.min(1, OPTIMIZED_IMAGE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1 && file.type === "image/jpeg" && file.size < 1.5 * 1024 * 1024) {
    URL.revokeObjectURL(image.src);
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(image.src);
    return file;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas);
  URL.revokeObjectURL(image.src);

  if (!blob || blob.size >= file.size) return file;

  const optimizedName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${optimizedName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not optimize ${file.name}.`));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", OPTIMIZED_IMAGE_QUALITY);
  });
}
