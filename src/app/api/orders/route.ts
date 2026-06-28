import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    sessionType?: string;
    preferredDate?: string | null;
    location?: string;
    message?: string;
  };

  if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "Name, email, and session details are required." }, { status: 400 });
  }

  const email = body.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      name: body.name.trim(),
      email,
      phone: body.phone?.trim() || null,
      session_type: body.sessionType?.trim() || null,
      preferred_date: body.preferredDate || null,
      location: body.location?.trim() || null,
      message: body.message.trim()
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orderId: data.id });
}
