import { NextResponse } from "next/server";
import { isSameOrigin, requestOrigin } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isSameOrigin(request)) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Fall through to the login page; no session data is exposed.
    }
  }
  const response = NextResponse.redirect(new URL("/login", requestOrigin(request)), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
