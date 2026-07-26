"use client";

import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ClipboardList, Copy, Database, Eye, EyeOff, ImagePlus, LogOut, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { formatDate } from "@/lib/format";
import type { Gallery, PortfolioPhotoWithUrl } from "@/types/gallery";
import type { Order } from "@/types/order";

type GalleryWithCount = Gallery & { photoCount: number; missingPhotoCount?: number };
type UploadPhase = "idle" | "optimizing" | "sending" | "processing";
type UploadTarget = "gallery" | "portfolio" | "";
type StorageUsage = {
  bucket: string;
  bytesUsed: number;
  fileCount: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
};

const OPTIMIZED_IMAGE_MAX_DIMENSION = 1800;
const OPTIMIZED_IMAGE_QUALITY = 0.76;
const MAX_UPLOAD_BATCH_BYTES = 3.5 * 1024 * 1024;
const PAST_IMAGE_REQUEST_TYPE = "Past session image request";

function isPastImageRequest(order: Order) {
  return order.session_type === PAST_IMAGE_REQUEST_TYPE;
}

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
  const [portfolioPhotos, setPortfolioPhotos] = useState<PortfolioPhotoWithUrl[]>([]);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioCategory, setPortfolioCategory] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [selectedPortfolioFiles, setSelectedPortfolioFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [working, setWorking] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>("");
  const [optimizeUploads, setOptimizeUploads] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const portfolioFileInputRef = useRef<HTMLInputElement>(null);

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

  const loadPortfolio = useCallback(async (accessToken = token) => {
    setPortfolioLoading(true);
    const response = await apiFetch("/api/admin/portfolio", {}, accessToken);

    if (response.status === 401 || response.status === 403) {
      router.replace("/admin/login");
      return;
    }

    if (!response.ok) {
      setPortfolioPhotos([]);
      setPortfolioLoading(false);
      return;
    }

    const payload = (await response.json()) as { photos: PortfolioPhotoWithUrl[] };
    setPortfolioPhotos(payload.photos || []);
    setPortfolioLoading(false);
  }, [apiFetch, router, token]);

  const loadStorageUsage = useCallback(async (accessToken = token) => {
    setStorageLoading(true);
    setStorageError("");
    const response = await apiFetch("/api/admin/storage", {}, accessToken);

    if (response.status === 401 || response.status === 403) {
      router.replace("/admin/login");
      return;
    }

    const payload = (await response.json()) as StorageUsage & { error?: string };
    if (!response.ok) {
      setStorageError(payload.error || "Could not load storage usage.");
      setStorageUsage(null);
      setStorageLoading(false);
      return;
    }

    setStorageUsage(payload);
    setStorageLoading(false);
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
    loadPortfolio(accessToken);
    loadStorageUsage(accessToken);
  }, [loadGalleries, loadOrders, loadPortfolio, loadStorageUsage, router]);

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
        title: `${order.name} Gallery`,
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
    setUploadTarget("gallery");

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
        setUploadTarget("");
        setUploadProgress(0);
        setMessage(error instanceof Error ? error.message : "Could not optimize photos.");
        return;
      }

      uploadFiles = optimizedFiles;
    }

    setUploadProgress(0);
    setUploadPhase("sending");
    const uploadBatches = createUploadBatches(uploadFiles);
    const uploadTotalBytes = uploadFiles.reduce((totalBytes, file) => totalBytes + file.size, 0);
    let uploadedBytesBeforeBatch = 0;
    let uploadedCount = 0;

    for (let batchIndex = 0; batchIndex < uploadBatches.length; batchIndex += 1) {
      const batch = uploadBatches[batchIndex];
      const batchBytes = batch.reduce((totalBytes, file) => totalBytes + file.size, 0);
      const { ok, payload } = await uploadPhotoBatch({
        batch,
        galleryId: selectedGalleryId,
        token,
        onProgress: (loadedBytes) => {
          const totalLoadedBytes = Math.min(uploadedBytesBeforeBatch + loadedBytes, uploadTotalBytes);
          setUploadProgress(Math.round((totalLoadedBytes / uploadTotalBytes) * 100));
          if (loadedBytes >= batchBytes) setUploadPhase("processing");
        }
      });

      if (!ok) {
        setWorking(false);
        setUploadPhase("idle");
        setUploadTarget("");
        setUploadProgress(0);
        setMessage(payload.error || `Could not upload batch ${batchIndex + 1} of ${uploadBatches.length}.`);
        return;
      }

      uploadedBytesBeforeBatch += batchBytes;
      uploadedCount += payload.count || 0;

      if (batchIndex < uploadBatches.length - 1) {
        setUploadPhase("sending");
      }
    }

    setWorking(false);
    setUploadPhase("idle");
    setUploadTarget("");

    setSelectedFiles([]);
    setUploadProgress(100);
    setMessage(`Uploaded ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"}.`);
    await loadGalleries();
    await loadStorageUsage();
  }

  async function uploadPortfolioPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedPortfolioFiles.length === 0) return;

    setWorking(true);
    setMessage("");
    setUploadProgress(0);
    setUploadTarget("portfolio");

    let uploadFiles = selectedPortfolioFiles;
    if (optimizeUploads) {
      setUploadPhase("optimizing");
      const optimizedFiles = [];

      try {
        for (let index = 0; index < selectedPortfolioFiles.length; index += 1) {
          optimizedFiles.push(await optimizeImageFile(selectedPortfolioFiles[index]));
          setUploadProgress(Math.round(((index + 1) / selectedPortfolioFiles.length) * 100));
        }
      } catch (error) {
        setWorking(false);
        setUploadPhase("idle");
        setUploadTarget("");
        setUploadProgress(0);
        setMessage(error instanceof Error ? error.message : "Could not optimize portfolio photos.");
        return;
      }

      uploadFiles = optimizedFiles;
    }

    setUploadProgress(0);
    setUploadPhase("sending");
    const uploadBatches = createUploadBatches(uploadFiles);
    const uploadTotalBytes = uploadFiles.reduce((totalBytes, file) => totalBytes + file.size, 0);
    let uploadedBytesBeforeBatch = 0;
    let uploadedCount = 0;

    for (let batchIndex = 0; batchIndex < uploadBatches.length; batchIndex += 1) {
      const batch = uploadBatches[batchIndex];
      const batchBytes = batch.reduce((totalBytes, file) => totalBytes + file.size, 0);
      const { ok, payload } = await uploadPortfolioPhotoBatch({
        batch,
        token,
        title: portfolioTitle,
        category: portfolioCategory,
        description: portfolioDescription,
        applyDetails: selectedPortfolioFiles.length === 1,
        onProgress: (loadedBytes) => {
          const totalLoadedBytes = Math.min(uploadedBytesBeforeBatch + loadedBytes, uploadTotalBytes);
          setUploadProgress(Math.round((totalLoadedBytes / uploadTotalBytes) * 100));
          if (loadedBytes >= batchBytes) setUploadPhase("processing");
        }
      });

      if (!ok) {
        setWorking(false);
        setUploadPhase("idle");
        setUploadTarget("");
        setUploadProgress(0);
        setMessage(payload.error || `Could not upload portfolio batch ${batchIndex + 1} of ${uploadBatches.length}.`);
        return;
      }

      uploadedBytesBeforeBatch += batchBytes;
      uploadedCount += payload.count || 0;

      if (batchIndex < uploadBatches.length - 1) {
        setUploadPhase("sending");
      }
    }

    setWorking(false);
    setUploadPhase("idle");
    setUploadTarget("");
    setSelectedPortfolioFiles([]);
    setPortfolioTitle("");
    setPortfolioDescription("");
    setUploadProgress(100);
    setMessage(`Uploaded ${uploadedCount} portfolio photo${uploadedCount === 1 ? "" : "s"}.`);
    await loadPortfolio();
    await loadStorageUsage();
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
      await loadStorageUsage();
    }
  }

  async function togglePortfolioActive(photo: PortfolioPhotoWithUrl) {
    const response = await apiFetch(`/api/admin/portfolio/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !photo.active })
    });

    if (response.ok) await loadPortfolio();
  }

  async function deletePortfolioPhoto(photo: PortfolioPhotoWithUrl) {
    const title = photo.title || photo.original_filename;
    if (!confirm(`Delete "${title}" from Jewells Portfolio? This cannot be undone.`)) return;

    const response = await apiFetch(`/api/admin/portfolio/${photo.id}`, {
      method: "DELETE"
    });

    if (response.ok) {
      setMessage("Portfolio photo deleted.");
      await loadPortfolio();
      await loadStorageUsage();
    }
  }

  async function deleteOrder(order: Order) {
    if (!confirm(`Delete the order from ${order.name}? This cannot be undone.`)) return;

    setDeletingOrderId(order.id);
    setMessage("");

    const response = await apiFetch("/api/admin/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id })
    });

    setDeletingOrderId("");

    if (!response.ok) {
      const payload = await response.json().catch(() => ({} as { error?: string }));
      setMessage(payload.error || "Could not delete order.");
      return;
    }

    setOrders((currentOrders) => currentOrders.filter((currentOrder) => currentOrder.id !== order.id));
    setMessage(`Order from ${order.name} deleted.`);
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

  function addPortfolioFiles(files: File[]) {
    const incomingFiles = files.filter((file) => file.type.startsWith("image/"));
    if (incomingFiles.length === 0 || working) return;

    setSelectedPortfolioFiles((currentFiles) => {
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

  function onPortfolioFileChange(event: ChangeEvent<HTMLInputElement>) {
    addPortfolioFiles(Array.from(event.target.files || []));

    event.target.value = "";
  }

  function onPhotoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function onPortfolioPhotoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addPortfolioFiles(Array.from(event.dataTransfer.files || []));
  }

  function removeSelectedFile(fileToRemove: File) {
    if (working) return;
    setSelectedFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
  }

  function removeSelectedPortfolioFile(fileToRemove: File) {
    if (working) return;
    setSelectedPortfolioFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
  }

  const selectedUploadSize = useMemo(
    () => selectedFiles.reduce((totalBytes, file) => totalBytes + file.size, 0),
    [selectedFiles]
  );

  const selectedPortfolioUploadSize = useMemo(
    () => selectedPortfolioFiles.reduce((totalBytes, file) => totalBytes + file.size, 0),
    [selectedPortfolioFiles]
  );

  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 MB";
    const megabytes = bytes / 1024 / 1024;
    if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
    return `${(megabytes / 1024).toFixed(1)} GB`;
  }

  function formatStorageSize(bytes: number) {
    if (bytes <= 0) return "0 MB";
    const megabytes = bytes / 1024 / 1024;
    if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
    const gigabytes = megabytes / 1024;
    return `${gigabytes.toFixed(gigabytes >= 10 ? 1 : 2)} GB`;
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

  function formatPreferredTime(value: string) {
    const [hourText, minuteText] = value.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
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

        <section className="mb-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Database className="text-leaf" size={20} />
                <h2 className="text-xl font-bold text-ink">Photo storage</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#52616b]">
                Private photo bucket usage for uploaded gallery images.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => loadStorageUsage()} disabled={storageLoading}>
              {storageLoading ? "Checking..." : "Refresh"}
            </Button>
          </div>

          {storageLoading ? <p className="mt-4 text-sm text-[#52616b]">Checking storage usage...</p> : null}
          {storageError ? <p className="mt-4 text-sm text-[#9b5675]">{storageError}</p> : null}
          {storageUsage && !storageLoading ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-[#f6f8f3] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616b]">Used</p>
                  <p className="mt-1 text-2xl font-bold text-ink">{formatStorageSize(storageUsage.bytesUsed)}</p>
                </div>
                <div className="rounded-md bg-[#f6f8f3] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616b]">Remaining</p>
                  <p className="mt-1 text-2xl font-bold text-ink">{formatStorageSize(storageUsage.remainingBytes)}</p>
                </div>
                <div className="rounded-md bg-[#f6f8f3] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616b]">Photos</p>
                  <p className="mt-1 text-2xl font-bold text-ink">{storageUsage.fileCount}</p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                  <span>{storageUsage.percentUsed}% used</span>
                  <span>
                    {formatStorageSize(storageUsage.bytesUsed)} of {formatStorageSize(storageUsage.limitBytes)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#e7ece2]">
                  <div
                    className="h-full rounded-full bg-leaf transition-[width] duration-300"
                    style={{ width: `${storageUsage.percentUsed}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </section>

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
                {working && uploadTarget === "gallery" && uploadPhase !== "idle" ? (
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
                          ? "Sending files in smaller batches."
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

            <form onSubmit={uploadPortfolioPhotos} className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="text-leaf" size={20} />
                <h2 className="text-xl font-bold text-ink">Jewells Portfolio</h2>
              </div>
              <div className="grid gap-4">
                <Field
                  label="Photo title (optional)"
                  value={portfolioTitle}
                  onChange={(event) => setPortfolioTitle(event.target.value)}
                />
                <Field
                  label="Category (optional)"
                  value={portfolioCategory}
                  onChange={(event) => setPortfolioCategory(event.target.value)}
                  placeholder="Families, pets, portraits..."
                />
                <label className="grid gap-2 text-sm font-medium text-ink">
                  Short note (optional)
                  <textarea
                    className="min-h-24 rounded-md border border-[#d8ded3] bg-white px-3 py-2 text-base shadow-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    value={portfolioDescription}
                    onChange={(event) => setPortfolioDescription(event.target.value)}
                  />
                </label>
                <div
                  className="grid gap-3 rounded-lg border border-dashed border-[#cbd5c0] bg-[#fbfdf8] p-5 text-center text-sm text-[#52616b]"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onPortfolioPhotoDrop}
                >
                  <ImagePlus className="mx-auto text-leaf" />
                  <span>
                    {selectedPortfolioFiles.length
                      ? `${selectedPortfolioFiles.length} selected`
                      : "Add portfolio photos or drag them here"}
                  </span>
                  <Button type="button" variant="secondary" onClick={() => portfolioFileInputRef.current?.click()} disabled={working}>
                    Add portfolio photos
                  </Button>
                  <input
                    ref={portfolioFileInputRef}
                    className="sr-only"
                    type="file"
                    name="photos"
                    accept="image/*"
                    multiple={true}
                    onChange={onPortfolioFileChange}
                  />
                </div>
                {selectedPortfolioFiles.length ? (
                  <div className="grid gap-2 rounded-md bg-[#f6f8f3] p-3 text-sm text-[#52616b]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ink">
                        {selectedPortfolioFiles.length} photo{selectedPortfolioFiles.length === 1 ? "" : "s"} ready -{" "}
                        {formatFileSize(selectedPortfolioUploadSize)}
                      </span>
                      <Button type="button" variant="secondary" onClick={() => setSelectedPortfolioFiles([])} disabled={working}>
                        Clear
                      </Button>
                    </div>
                    <div className="grid max-h-36 gap-2 overflow-auto">
                      {selectedPortfolioFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#52616b] transition hover:bg-[#eef3e9] hover:text-ink"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeSelectedPortfolioFile(file)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {working && uploadTarget === "portfolio" && uploadPhase !== "idle" ? (
                  <div className="grid gap-2 rounded-md border border-[#d8ded3] bg-white p-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                      <span>
                        {uploadPhase === "optimizing"
                          ? "Optimizing portfolio photos"
                          : uploadPhase === "sending"
                            ? "Uploading portfolio photos"
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
                  </div>
                ) : null}
                <Button type="submit" disabled={working || selectedPortfolioFiles.length === 0}>
                  <Upload size={18} /> Add to portfolio
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="text-leaf" size={20} />
                <h2 className="text-xl font-bold text-ink">Portfolio photos</h2>
              </div>
              {portfolioLoading ? <p className="text-[#52616b]">Loading portfolio...</p> : null}
              <div className="grid gap-3">
                {portfolioPhotos.map((photo) => {
                  const title = photo.title || photo.original_filename;

                  return (
                    <article key={photo.id} className="rounded-lg border border-[#e4e8df] p-3">
                      <div className="grid gap-3 sm:grid-cols-[6.5rem_1fr]">
                        <div className="aspect-square overflow-hidden rounded-md bg-[#e9eee5]">
                          {photo.imageUrl ? (
                            <img className="h-full w-full object-cover" src={photo.imageUrl} alt={title} />
                          ) : (
                            <span className="flex h-full items-center justify-center text-xs text-[#52616b]">
                              No preview
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-ink" title={title}>
                                {title}
                              </h3>
                              <p className="mt-1 text-sm text-[#52616b]">
                                {photo.category || "Uncategorized"} - {photo.likeCount} like{photo.likeCount === 1 ? "" : "s"} -{" "}
                                {photo.active ? "Visible" : "Hidden"}
                              </p>
                              {photo.description ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#52616b]">{photo.description}</p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                              <Button type="button" variant="secondary" onClick={() => togglePortfolioActive(photo)}>
                                {photo.active ? <EyeOff size={16} /> : <Eye size={16} />}
                                {photo.active ? "Hide" : "Show"}
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => deletePortfolioPhoto(photo)}>
                                <Trash2 size={16} /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!portfolioLoading && portfolioPhotos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#d8ded3] p-6 text-center text-[#52616b]">
                    No portfolio photos yet. Upload a few favorites to show on the public portfolio.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="text-leaf" size={20} />
                <h2 className="text-xl font-bold text-ink">Orders</h2>
              </div>
              {ordersLoading ? <p className="text-[#52616b]">Loading orders...</p> : null}
              <div className="grid gap-3">
                {orders.map((order) => {
                  const pastImageRequest = isPastImageRequest(order);

                  return (
                    <article key={order.id} className="rounded-lg border border-[#e4e8df] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-ink">{order.name}</h3>
                            <span className="rounded-full bg-petal px-2 py-0.5 text-xs font-semibold text-ink">
                              {order.status}
                            </span>
                            {pastImageRequest ? (
                              <span className="rounded-full bg-[#fff7f4] px-2 py-0.5 text-xs font-semibold text-[#844865]">
                                Past images
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-[#52616b]">
                            {order.email}
                            {order.phone ? ` - ${order.phone}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-[#52616b]">
                            {pastImageRequest ? PAST_IMAGE_REQUEST_TYPE : order.session_type || "Session request"}
                          </p>
                          {!pastImageRequest && order.preferred_date ? (
                            <p className="mt-1 text-sm text-[#52616b]">Preferred date {formatDate(order.preferred_date)}</p>
                          ) : null}
                          {!pastImageRequest && order.preferred_time ? (
                            <p className="mt-1 text-sm text-[#52616b]">
                              Preferred time {formatPreferredTime(order.preferred_time)}
                            </p>
                          ) : null}
                          {!pastImageRequest && order.location ? (
                            <p className="mt-1 text-sm text-[#52616b]">{order.location}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <p className="text-sm text-[#52616b]">{formatSubmittedDate(order.created_at)}</p>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button type="button" variant="secondary" onClick={() => createGalleryFromOrder(order)} disabled={working}>
                              Create gallery
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => deleteOrder(order)}
                              disabled={Boolean(deletingOrderId)}
                            >
                              <Trash2 size={16} /> {deletingOrderId === order.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap rounded-md bg-[#f6f8f3] px-3 py-2 text-sm leading-6 text-[#52616b]">
                        {order.message}
                      </p>
                    </article>
                  );
                })}
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

function createUploadBatches(files: File[]) {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentBatchBytes = 0;

  for (const file of files) {
    const wouldExceedBatch = currentBatch.length > 0 && currentBatchBytes + file.size > MAX_UPLOAD_BATCH_BYTES;
    if (wouldExceedBatch) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchBytes = 0;
    }

    currentBatch.push(file);
    currentBatchBytes += file.size;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

function uploadPhotoBatch({
  batch,
  galleryId,
  token,
  onProgress
}: {
  batch: File[];
  galleryId: string;
  token: string;
  onProgress: (loadedBytes: number) => void;
}) {
  const body = new FormData();
  batch.forEach((file) => body.append("photos", file));

  return new Promise<{ ok: boolean; payload: { count?: number; error?: string } }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/galleries/${galleryId}/photos`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable) onProgress(progressEvent.loaded);
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
}

function uploadPortfolioPhotoBatch({
  batch,
  token,
  title,
  category,
  description,
  applyDetails,
  onProgress
}: {
  batch: File[];
  token: string;
  title: string;
  category: string;
  description: string;
  applyDetails: boolean;
  onProgress: (loadedBytes: number) => void;
}) {
  const body = new FormData();
  batch.forEach((file) => body.append("photos", file));
  body.append("title", title);
  body.append("category", category);
  body.append("description", description);
  body.append("applyDetails", String(applyDetails));

  return new Promise<{ ok: boolean; payload: { count?: number; error?: string } }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/portfolio");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable) onProgress(progressEvent.loaded);
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
