import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const PHOTO_BUCKET = "gallery-photos";

const supabaseUrlEnvNames = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_PROJECT_URL"] as const;
const supabaseAnonKeyEnvNames = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY"
] as const;
const supabaseServiceRoleKeyEnvNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SECRET_KEY"
] as const;

function firstEnvValue(names: readonly string[]) {
  return names.find((name) => process.env[name]) || null;
}

function getSupabaseUrlEnvName() {
  return firstEnvValue(supabaseUrlEnvNames);
}

function getSupabaseAnonKeyEnvName() {
  return firstEnvValue(supabaseAnonKeyEnvNames);
}

function getSupabaseServiceRoleKeyEnvName() {
  return firstEnvValue(supabaseServiceRoleKeyEnvNames);
}

function getSupabaseUrl() {
  const envName = getSupabaseUrlEnvName();
  return envName ? process.env[envName] : undefined;
}

function getSupabaseAnonKey() {
  const envName = getSupabaseAnonKeyEnvName();
  return envName ? process.env[envName] : undefined;
}

function getSupabaseServiceRoleKey() {
  const envName = getSupabaseServiceRoleKeyEnvName();
  return envName ? process.env[envName] : undefined;
}

function assertSupabaseApiUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Supabase URL is not a valid URL. It should look like https://your-project-ref.supabase.co");
  }

  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error(
      "Supabase URL is wrong. Use the API URL that looks like https://your-project-ref.supabase.co, not a Postgres/database URL."
    );
  }
}

export function getSupabaseSetupStatus() {
  const urlEnvName = getSupabaseUrlEnvName();
  const url = getSupabaseUrl();
  const anonKeyEnvName = getSupabaseAnonKeyEnvName();
  const serviceRoleKeyEnvName = getSupabaseServiceRoleKeyEnvName();
  let urlStatus = "missing";
  let urlHost: string | null = null;
  let urlProblem: string | null = null;

  if (url) {
    try {
      const parsed = new URL(url);
      urlHost = parsed.host;
      assertSupabaseApiUrl(url);
      urlStatus = "valid";
    } catch (error) {
      urlStatus = "invalid";
      urlProblem = error instanceof Error ? error.message : "Supabase URL is invalid.";
    }
  }

  return {
    supabaseUrl: {
      found: Boolean(url),
      envName: urlEnvName,
      host: urlHost,
      status: urlStatus,
      problem: urlProblem
    },
    anonKey: {
      found: Boolean(getSupabaseAnonKey()),
      envName: anonKeyEnvName
    },
    serviceRoleKey: {
      found: Boolean(getSupabaseServiceRoleKey()),
      envName: serviceRoleKeyEnvName
    },
    adminEmail: {
      found: Boolean(process.env.ADMIN_EMAIL)
    },
    siteUrl: {
      found: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      value: process.env.NEXT_PUBLIC_SITE_URL || null
    }
  };
}

export function createServiceSupabaseClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Need SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  assertSupabaseApiUrl(url);

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

  assertSupabaseApiUrl(url);

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
