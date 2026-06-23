import { UserRoundCheck } from "lucide-react";
import { saveProfileAction } from "@/app/actions/profile";
import { BrandHeader } from "@/components/brand-header";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentProfile, isProfileComplete, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireVerifiedUser();
  const profile = await getCurrentProfile(user.id);
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="app-shell">
      <BrandHeader isAuthed />
      <section className="page-heading">
        <UserRoundCheck size={34} />
        <div>
          <h1>Wer bist du, Gurke?</h1>
          <p>Diese Daten landen im Mitgliederbereich und helfen bei Buchung, Zahlung und Planung.</p>
        </div>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {isProfileComplete(profile) ? <p className="notice success">Dein Profil ist vollständig.</p> : null}
      <form className="form-panel wide" action={saveProfileAction}>
        <div className="form-grid three">
          <label>
            Vorname
            <input name="firstName" defaultValue={profile?.first_name || ""} required />
          </label>
          <label>
            Name
            <input name="lastName" defaultValue={profile?.last_name || ""} required />
          </label>
          <label>
            Wohnort
            <input name="hometown" defaultValue={profile?.hometown || ""} required />
          </label>
        </div>
        <SubmitButton>Profil speichern</SubmitButton>
      </form>
    </main>
  );
}
