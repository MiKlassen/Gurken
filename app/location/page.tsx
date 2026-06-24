import { ExternalLink, MapPin, Route } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { getActiveEventForMember, getIsAdmin, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export default async function LocationPage() {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const [isAdmin, event] = await Promise.all([getIsAdmin(user.id, user.email), getActiveEventForMember()]);

  const metaRows = event
    ? [
        [event.location_meta_label_1, event.location_meta_value_1],
        [event.location_meta_label_2, event.location_meta_value_2]
      ].filter(([label, value]) => hasText(label) || hasText(value))
    : [];

  return (
    <main className="app-shell">
      <BrandHeader isAuthed isAdmin={isAdmin} />
      <section className="page-heading">
        <MapPin size={34} />
        <div>
          <h1>Ort</h1>
          <p>{event?.location_label || "Noch kein Ort eingetragen."}</p>
        </div>
      </section>

      {event ? (
        <section className="location-layout">
          <article className="panel location-main">
            <Route />
            <h2>{event.location_label || "Treffpunkt"}</h2>
            {event.location_address ? (
              <>
                <h3>Adresse</h3>
                <p className="location-address">{event.location_address}</p>
              </>
            ) : (
              <p className="notice-inline">Adresse noch nicht eingetragen.</p>
            )}
            {event.location_details ? (
              <>
                <h3>Hinweise</h3>
                <p className="location-address">{event.location_details}</p>
              </>
            ) : null}
            {event.location_url ? (
              <a className="button primary location-link" href={event.location_url} target="_blank" rel="noreferrer">
                <ExternalLink size={18} /> Ortslink öffnen
              </a>
            ) : null}
          </article>

          <aside className="panel location-side">
            <h2>Details</h2>
            <dl className="location-facts">
              <div>
                <dt>Treffen</dt>
                <dd>{event.subject || event.name}</dd>
              </div>
              <div>
                <dt>Ort</dt>
                <dd>{event.location_label || "offen"}</dd>
              </div>
              {metaRows.map(([label, value], index) => (
                <div key={`${label}-${index}`}>
                  <dt>{label || `Zusatz ${index + 1}`}</dt>
                  <dd>{value || "offen"}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>
      ) : (
        <p className="notice error">Kein aktives Treffen gefunden.</p>
      )}
    </main>
  );
}
