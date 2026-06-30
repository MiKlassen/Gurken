import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";

function getSearchParam(url: URL, key: string) {
  return url.searchParams.get(key) || "";
}

function resolveNextPath(value: string) {
  if (!value) return "/dashboard";

  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    if (url.origin !== getSiteUrl()) return "/dashboard";
    return url.searchParams.get("next") || `${url.pathname}${url.search}`;
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = getSearchParam(requestUrl, "code");
  const next = resolveNextPath(getSearchParam(requestUrl, "next") || getSearchParam(requestUrl, "redirect_to"));

  if (!code) {
    return NextResponse.redirect(
      `${getSiteUrl()}/auth/login?error=${encodeURIComponent("Der Login-Link ist unvollständig. Bitte fordere eine neue Mail an.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${getSiteUrl()}${next}`);
}
