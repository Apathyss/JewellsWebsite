import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const PHOTO_BUCKET = "gallery-photos";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function createServiceSupabaseClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Need SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createAuthSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase auth environment variables. Need SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, plus SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(url, key, {
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

  const authSupabase = createAuthSupabaseClient();
  const { data, error } = await authSupabase.auth.getUser(token);

  if (error || !data.user?.email) {
    return { error: "Invalid admin session.", status: 401 as const };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail && data.user.email.toLowerCase() !== adminEmail) {
    return { error: "This account is not allowed to manage galleries.", status: 403 as const };
  }

  return { user: data.user, supabase: createServiceSupabaseClient() };
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
