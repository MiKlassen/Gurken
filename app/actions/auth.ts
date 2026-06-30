"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

type EmailCodeType = "email" | "invite" | "magiclink" | "recovery" | "email_change";

const emailCodeTypes = new Set<string>(["email", "invite", "magiclink", "recovery", "email_change"]);

function safeNextPath(value: string, fallback = "/onboarding") {
  if (!value) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

function safeEmailCodeType(value: string): EmailCodeType {
  return emailCodeTypes.has(value) ? (value as EmailCodeType) : "email";
}

function confirmPagePath(params: { email?: string; error?: string; message?: string; next?: string; type?: string }) {
  const search = new URLSearchParams();
  if (params.email) search.set("email", params.email);
  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  search.set("type", safeEmailCodeType(params.type || "email"));
  search.set("next", safeNextPath(params.next || "/onboarding"));
  return `/auth/confirm?${search.toString()}` as Route;
}

function requireString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signUpAction(formData: FormData) {
  const email = requireString(formData, "email").toLowerCase();
  const password = requireString(formData, "password");
  const turnstileToken = formData.get("turnstileToken");

  if (!(await verifyTurnstile(turnstileToken))) {
    redirect("/auth/register?error=Turnstile konnte nicht verifiziert werden.");
  }

  if (!email || password.length < 8) {
    redirect("/auth/register?error=Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen angeben.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm/complete`
    }
  });

  if (error) redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
  redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
}

export async function confirmEmailCodeAction(formData: FormData) {
  const email = requireString(formData, "email").toLowerCase();
  const token = requireString(formData, "token").replace(/\s/g, "");
  const next = safeNextPath(requireString(formData, "next"));
  const type = safeEmailCodeType(requireString(formData, "type"));

  if (!email || !token) {
    redirect(confirmPagePath({ email, next, type, error: "Bitte E-Mail und Bestätigungscode angeben." }));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type
  });

  if (error) redirect(confirmPagePath({ email, next, type, error: error.message }));
  redirect(confirmPagePath({ next, type, message: "E-Mail bestätigt. Du bist jetzt angemeldet." }));
}

export async function signInAction(formData: FormData) {
  const email = requireString(formData, "email").toLowerCase();
  const password = requireString(formData, "password");

  if (!email || !password) redirect("/auth/login?error=Bitte E-Mail und Passwort angeben.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function resetPasswordAction(formData: FormData) {
  const email = requireString(formData, "email").toLowerCase();
  if (!email) redirect("/auth/login?error=Bitte E-Mail angeben.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`
  });

  if (error) redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  redirect("/auth/login?message=Wenn die Adresse bekannt ist, wurde eine Mail verschickt.");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
