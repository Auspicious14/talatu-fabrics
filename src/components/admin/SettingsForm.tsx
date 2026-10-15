"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/app/admin/actions";

type S = {
  business_name: string; whatsapp_number: string; instagram_url: string; contact_email: string; contact_phone: string;
  business_address: string; announcement_text: string; announcement_enabled: boolean; hero_headline: string; hero_subtext: string;
  about_text: string; delivery_text: string; returns_text: string;
};

export function SettingsForm({ defaults }: { defaults: S }) {
  const [v, setV] = useState<S>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const inp = "h-11 w-full border border-line bg-ivory px-3 focus:border-wine focus:outline-none aria-[invalid=true]:border-warn";
  const area = "w-full border border-line bg-ivory px-3 py-2 focus:border-wine focus:outline-none";
  const set = <K extends keyof S>(k: K, val: S[K]) => setV((s) => ({ ...s, [k]: val }));

  const text = (k: keyof S, label: string, hint?: string, type = "text") => (
    <div>
      <label htmlFor={k} className="eyebrow mb-1.5 block">{label}</label>
      <input id={k} type={type} value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} aria-invalid={!!errors[k]} className={inp} />
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {errors[k] ? <p role="alert" className="mt-1 text-sm text-warn">{errors[k]}</p> : null}
    </div>
  );
  const long = (k: keyof S, label: string, hint: string) => (
    <div>
      <label htmlFor={k} className="eyebrow mb-1.5 block">{label}</label>
      <textarea id={k} rows={5} value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} className={area} />
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );

  return (
    <form
      className="mt-8 space-y-10"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const r = await saveSettings(v);
        setSaving(false);
        if (!r.ok) { setErrors(r.fieldErrors ?? {}); return void toast.error(r.error); }
        setErrors({}); toast.success("Settings saved.");
      }}
    >
      <section className="space-y-5">
        <h2 className="text-3xl">Contact</h2>
        {text("business_name", "Business name")}
        {text("whatsapp_number", "WhatsApp number", "International format, e.g. +234 803 000 0000. Customer enquiries go here.")}
        {text("contact_phone", "Phone (optional)")}
        {text("contact_email", "Email (optional)", undefined, "email")}
        {text("business_address", "Address (optional)", "Only fill this in if you want it shown publicly.")}
        {text("instagram_url", "Instagram link")}
      </section>
      <section className="space-y-5">
        <h2 className="text-3xl">Homepage</h2>
        {text("hero_headline", "Hero headline (optional)", "Leave blank to use the default.")}
        {text("hero_subtext", "Hero sub-text (optional)")}
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={v.announcement_enabled} onChange={(e) => set("announcement_enabled", e.target.checked)} className="h-4 w-4 accent-wine" /> Show the announcement bar</label>
        {text("announcement_text", "Announcement text")}
      </section>
      <section className="space-y-5">
        <h2 className="text-3xl">Pages</h2>
        {long("about_text", "About us", "Your story, in your words. Hidden until you write it.")}
        {long("delivery_text", "Ordering & delivery", "Delivery areas, timing, payment arrangements.")}
        {long("returns_text", "Returns & exchanges", "Your policy.")}
      </section>
      <button type="submit" disabled={saving} className="h-12 bg-wine px-8 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep disabled:opacity-60">
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
