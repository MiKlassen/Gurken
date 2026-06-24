"use server";

import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/data";
import { encryptProfileFields } from "@/lib/personal-data";
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
    redirect("/onboarding?error=Bitte Vorname, Name und Wohnort ausfüllen.");
  }

  let encryptedProfile;
  try {
    encryptedProfile = encryptProfileFields({
      first_name: firstName,
      last_name: lastName,
      hometown
    });
  } catch (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error instanceof Error ? error.message : "Verschlüsselung fehlgeschlagen.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      ...encryptedProfile
    },
    { onConflict: "user_id" }
  );

  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
