import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type EmailVerificationType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const emailVerificationTypes = new Set<string>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function getSearchParam(url: URL, key: string) {
  return url.searchParams.get(key) || "";
}

function safeNextPath(value: string, fallback = "/onboarding") {
  if (!value) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

function confirmUrl(params: { email?: string; error?: string; message?: string; next?: string }) {
  const url = new URL("/auth/confirm", getSiteUrl());
  if (params.email) url.searchParams.set("email", params.email);
  if (params.error) url.searchParams.set("error", params.error);
  if (params.message) url.searchParams.set("message", params.message);
  url.searchParams.set("next", safeNextPath(params.next || "/onboarding"));
  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = getSearchParam(requestUrl, "token_hash");
  const type = getSearchParam(requestUrl, "type") || "signup";
  const email = getSearchParam(requestUrl, "email");
  const next = safeNextPath(getSearchParam(requestUrl, "next"));

  if (!tokenHash || !emailVerificationTypes.has(type)) {
    return NextResponse.redirect(
      confirmUrl({
        email,
        next,
        error: "Der Bestätigungslink ist unvollständig. Bitte gib den Bestätigungscode aus der Mail ein."
      })
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailVerificationType
  });

  if (error) {
    return NextResponse.redirect(
      confirmUrl({
        email,
        next,
        error: error.message
      })
    );
  }

  return NextResponse.redirect(
    confirmUrl({
      next,
      message: "E-Mail bestätigt. Du bist jetzt angemeldet."
    })
  );
}
