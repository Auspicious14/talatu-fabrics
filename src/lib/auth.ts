import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side admin gate. Used by every admin page layout AND every server action.
 * Authorisation = a valid session AND a row in admin_users (readable only by that user
 * under RLS). The proxy redirect is a convenience, never the security boundary.
 */
export async function getAdminContext() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data: row } = await supabase.from("admin_users").select("role").eq("user_id", auth.user.id).maybeSingle();
    if (!row) return null;
    return { supabase, user: auth.user, role: row.role as string };
  } catch {
    // Not configured or Supabase unreachable: fail closed.
    return null;
  }
}

export async function requireAdmin() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  return ctx;
}
