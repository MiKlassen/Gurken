import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";

type EmailVerificationType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const emailVerificationTypes = new Set<string>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function getSearchParam(url: URL, key: string) {
  return url.searchParams.get(key) || url.searchParams.get(`amp;${key}`) || "";
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
  const tokenHash = getSearchParam(requestUrl, "token_hash") || getSearchParam(requestUrl, "token");
  const type = getSearchParam(requestUrl, "type");
  const next = resolveNextPath(getSearchParam(requestUrl, "next") || getSearchParam(requestUrl, "redirect_to"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=${encodeURIComponent(error.message)}`);
    }
  } else if (tokenHash && emailVerificationTypes.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailVerificationType
    });

    if (error) {
      return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=${encodeURIComponent(error.message)}`);
    }
  } else if (tokenHash) {
    return NextResponse.redirect(
      `${getSiteUrl()}/auth/login?error=${encodeURIComponent("Der Bestätigungslink ist unvollständig. Bitte fordere eine neue Mail an.")}`
    );
  }

  return NextResponse.redirect(`${getSiteUrl()}${next}`);
}
