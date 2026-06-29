import { NextResponse } from "next/server";
import { getSupabaseSetupStatus } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json(getSupabaseSetupStatus());
}
