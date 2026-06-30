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
  const streetAddress = text(formData, "streetAddress");
  const postalCode = text(formData, "postalCode");
  const city = text(formData, "city");

  if (!firstName || !lastName || !streetAddress || !postalCode || !city) {
    redirect("/onboarding?error=Bitte Vorname, Name und vollständige Anschrift ausfüllen.");
  }

  let encryptedProfile;
  try {
    encryptedProfile = encryptProfileFields({
      first_name: firstName,
      last_name: lastName,
      hometown: city,
      street_address: streetAddress,
      postal_code: postalCode,
      city
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
