import { NextRequest, NextResponse } from "next/server";
import { createAuthSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = createAuthSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email.trim(),
      password: body.password
    });

    if (error || !data.session?.access_token || !data.user?.email) {
      return NextResponse.json({ error: error?.message || "Could not sign in." }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && data.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "This account is not allowed to manage the site." }, { status: 403 });
    }

    return NextResponse.json({ accessToken: data.session.access_token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign in." },
      { status: 500 }
    );
  }
}
