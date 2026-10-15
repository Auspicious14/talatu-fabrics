import { requireAdmin } from "@/lib/auth";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("id,name,description,is_public,slug").order("sort_order").order("name");
  const { data: counts } = await supabase.from("products").select("category_id").not("category_id", "is", null);
  const byCat = new Map<string, number>();
  for (const r of counts ?? []) byCat.set(r.category_id as string, (byCat.get(r.category_id as string) ?? 0) + 1);
  return (
    <div className="max-w-3xl">
      <h1 className="text-5xl">Categories</h1>
      <p className="mt-2 text-muted">Group fabrics so customers can browse them. Deleting a category never deletes its products.</p>
      <CategoryManager initial={(data ?? []).map((c) => ({ ...c, count: byCat.get(c.id) ?? 0 }))} />
    </div>
  );
}
