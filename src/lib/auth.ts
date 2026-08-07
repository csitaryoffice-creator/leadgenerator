import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requirePageUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const allowedEmail = getServerEnv().ALLOWED_USER_EMAIL.toLowerCase();
  if (user.email?.toLowerCase() !== allowedEmail) {
    redirect("/login?error=unauthorized");
  }

  return { user, supabase };
}

export async function requireApiUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Bejelentkezés szükséges." }, { status: 401 }) };
  }

  const allowedEmail = getServerEnv().ALLOWED_USER_EMAIL.toLowerCase();
  if (user.email?.toLowerCase() !== allowedEmail) {
    return { error: NextResponse.json({ error: "Ehhez a felülethez nincs jogosultságod." }, { status: 403 }) };
  }

  return { user, supabase };
}
