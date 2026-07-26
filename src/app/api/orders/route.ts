import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      sessionType?: string;
      preferredDate?: string | null;
      preferredTime?: string | null;
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
    const order = {
      name: body.name.trim(),
      email,
      phone: body.phone?.trim() || null,
      session_type: body.sessionType?.trim() || null,
      preferred_date: body.preferredDate || null,
      preferred_time: body.preferredTime || null,
      location: body.location?.trim() || null,
      message: body.message.trim()
    };

    let { data, error } = await supabase.from("orders").insert(order).select("id").single();

    if (error && error.message.toLowerCase().includes("preferred_time")) {
      const { preferred_time: _preferredTime, ...orderWithoutPreferredTime } = order;
      const fallbackResult = await supabase.from("orders").insert(orderWithoutPreferredTime).select("id").single();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Could not submit order." }, { status: 500 });

    return NextResponse.json({ orderId: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit order." },
      { status: 500 }
    );
  }
}
