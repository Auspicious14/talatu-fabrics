import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-less anon client for the public storefront. RLS limits it to published
 * products and public categories/settings. Returns null when Supabase is not
 * configured yet, so the site still builds and shows honest empty states.
 */
export function getPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function productImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/product-images/${storagePath}`;
}
