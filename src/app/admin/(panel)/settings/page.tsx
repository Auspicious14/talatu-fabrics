import { requireAdmin } from "@/lib/auth";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { isPreviewMode } from "@/lib/env";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_settings").select("key,value");
  const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : "");
  return (
    <div className="max-w-3xl">
      <h1 className="text-5xl">Site settings</h1>
      <p className="mt-2 text-muted">Everything here appears on the public site. Anything left blank is hidden or shown as &ldquo;being finalised&rdquo;. Nothing is invented for you.</p>
      {isPreviewMode() ? (
        <p className="mt-6 border border-line bg-cream p-4 text-sm">
          <strong>Private preview is on.</strong> The site asks for a password and is hidden from Google. To go live, set <code>PREVIEW_MODE=false</code> in the hosting environment variables and redeploy.
        </p>
      ) : null}
      <SettingsForm
        defaults={{
          business_name: str("business_name") || "Talatu Fabrics",
          whatsapp_number: str("whatsapp_number"), instagram_url: str("instagram_url"),
          contact_email: str("contact_email"), contact_phone: str("contact_phone"), business_address: str("business_address"),
          announcement_text: str("announcement_text"), announcement_enabled: s.announcement_enabled === true,
          hero_headline: str("hero_headline"), hero_subtext: str("hero_subtext"),
          about_text: str("about_text"), delivery_text: str("delivery_text"), returns_text: str("returns_text"),
        }}
      />
    </div>
  );
}
