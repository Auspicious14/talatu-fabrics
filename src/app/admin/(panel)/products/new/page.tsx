import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from("categories").select("id,name").order("sort_order");
  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 text-5xl">Add a product</h1>
      <ProductForm
        id={null}
        categories={categories ?? []}
        defaults={{
          name: "", sku: "", slug: "", category_id: "", short_description: "", description: "",
          priceNaira: "", pricing_unit: "", min_order_qty: "", stock_quantity: "",
          availability: "unconfirmed", publication_status: "draft", featured: false, needs_review: false,
          instagram_url: "", internal_notes: "", variants: [],
        } as never}
      />
    </div>
  );
}
