import { NextRequest, NextResponse } from "next/server";
import { PHOTO_BUCKET, requireAdmin } from "@/lib/supabase/server";

const DEFAULT_STORAGE_LIMIT_GB = 1;
const LIST_PAGE_SIZE = 1000;

type StorageListItem = {
  id: string | null;
  name: string;
  metadata?: {
    size?: number;
  } | null;
};

function getPhotoStorageLimitBytes() {
  const configuredLimit = Number(process.env.PHOTO_STORAGE_LIMIT_GB);
  const limitGb = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : DEFAULT_STORAGE_LIMIT_GB;

  return Math.round(limitGb * 1024 * 1024 * 1024);
}

function joinStoragePath(folderPath: string, itemName: string) {
  return folderPath ? `${folderPath}/${itemName}` : itemName;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const supabase = admin.supabase;

  async function scanFolder(folderPath = ""): Promise<{ bytesUsed: number; fileCount: number }> {
    let offset = 0;
    let bytesUsed = 0;
    let fileCount = 0;

    while (true) {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .list(folderPath, {
          limit: LIST_PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" }
        });

      if (error) throw new Error(error.message);

      const items = (data || []) as StorageListItem[];
      for (const item of items) {
        if (item.id === null) {
          const childUsage = await scanFolder(joinStoragePath(folderPath, item.name));
          bytesUsed += childUsage.bytesUsed;
          fileCount += childUsage.fileCount;
        } else {
          bytesUsed += item.metadata?.size || 0;
          fileCount += 1;
        }
      }

      if (items.length < LIST_PAGE_SIZE) break;
      offset += LIST_PAGE_SIZE;
    }

    return { bytesUsed, fileCount };
  }

  try {
    const { bytesUsed, fileCount } = await scanFolder();
    const limitBytes = getPhotoStorageLimitBytes();
    const remainingBytes = Math.max(0, limitBytes - bytesUsed);
    const percentUsed = limitBytes > 0 ? Math.min(100, Math.round((bytesUsed / limitBytes) * 1000) / 10) : 0;

    return NextResponse.json({
      bucket: PHOTO_BUCKET,
      bytesUsed,
      fileCount,
      limitBytes,
      remainingBytes,
      percentUsed
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not calculate storage usage." },
      { status: 500 }
    );
  }
}
