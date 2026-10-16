import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s | Talatu admin" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-cream lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/admin" aria-label="Talatu admin home" className="flex items-center gap-3">
            <Image src="/brand/mark.png" alt="" width={36} height={36} className="h-9 w-9" />
            <span className="font-serif text-xl text-wine">Admin</span>
          </Link>
          <form action={signOut} className="lg:mt-1">
            <button type="submit" className="text-xs text-muted underline">Sign out</button>
          </form>
        </div>
        <AdminNav />
        <p className="hidden truncate px-5 pb-4 text-xs text-muted lg:absolute lg:bottom-0 lg:block">{user.email}</p>
      </aside>
      <div className="min-w-0 px-5 py-8 lg:px-10">{children}</div>
    </div>
  );
}
