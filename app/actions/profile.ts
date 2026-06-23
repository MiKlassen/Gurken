"use server";

import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveProfileAction(formData: FormData) {
  const user = await requireVerifiedUser();
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const hometown = text(formData, "hometown");

  if (!firstName || !lastName || !hometown) {
    redirect("/onboarding?error=Bitte Vorname, Name und Wohnort ausfuellen.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      hometown
    },
    { onConflict: "user_id" }
  );

  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
