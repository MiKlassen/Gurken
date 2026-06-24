function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function getSupabaseClientKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  );
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseClientKey());
}

export function requireSupabaseEnv() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseClientKey();

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase URL or client key. Expected NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { url, anonKey };
}

function normalizeSiteUrl(value?: string) {
  if (!value) return "";
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, "");
}

export function getSiteUrl() {
  return (
    normalizeSiteUrl(process.env.SITE_URL) ||
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeSiteUrl(process.env.VERCEL_URL) ||
    "http://localhost:3000"
  );
}

export function getInitialAdminEmails() {
  return (process.env.INITIAL_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
