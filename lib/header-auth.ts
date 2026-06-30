import { getIsAdmin } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getHeaderAuthState() {
  if (!hasSupabaseEnv()) return { isAuthed: false, isAdmin: false };

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const isVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    if (!user || !isVerified) return { isAuthed: false, isAdmin: false };

    return {
      isAuthed: true,
      isAdmin: await getIsAdmin(user.id, user.email)
    };
  } catch {
    return { isAuthed: false, isAdmin: false };
  }
}
