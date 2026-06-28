import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const PHOTO_BUCKET = "gallery-photos";

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: "Missing admin session.", status: 401 as const };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    return { error: "Invalid admin session.", status: 401 as const };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail && data.user.email.toLowerCase() !== adminEmail) {
    return { error: "This account is not allowed to manage galleries.", status: 403 as const };
  }

  return { user: data.user, supabase };
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
