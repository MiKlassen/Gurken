"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

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
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/onboarding`
    }
  });

  if (error) redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
  redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
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
