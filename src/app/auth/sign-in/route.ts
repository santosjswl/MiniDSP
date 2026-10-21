import { NextResponse } from "next/server";
import { isSameOrigin, requestOrigin } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function redirectTo(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, requestOrigin(request)), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!isSameOrigin(request) || !(declared <= 4096)) {
    return redirectTo(request, "/login?error=invalid");
  }

  const form = await request.formData().catch(() => null);
  const email = form?.get("email");
  const password = form?.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    return redirectTo(request, "/login?error=invalid");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return redirectTo(request, "/login?error=invalid");
  } catch {
    return redirectTo(request, "/login?error=unavailable");
  }

  return redirectTo(request, "/");
}
