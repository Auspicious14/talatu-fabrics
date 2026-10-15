export type PublicationStatus = "draft" | "published" | "archived";
export type AvailabilityStatus = "available" | "made_to_order" | "sold_out" | "unconfirmed";
export type PricingUnit = "yard" | "set" | "piece" | "bundle" | "roll";
export type VariantKind = "colour" | "size" | "other";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_public: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  content_hash: string;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  kind: VariantKind;
  label: string;
  price_kobo: number | null;
  availability: AvailabilityStatus | null;
  sort_order: number;
}

export interface Product {
  id: string;
  sku: string | null;
  slug: string | null;
  name: string | null;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  /** Integer kobo. NULL means price unknown (show "Enquire for price"). */
  price_kobo: number | null;
  pricing_unit: PricingUnit | null;
  min_order_qty: number | null;
  stock_quantity: number | null;
  availability: AvailabilityStatus;
  publication_status: PublicationStatus;
  featured: boolean;
  instagram_url: string | null;
  source_caption: string | null;
  internal_notes: string | null;
  needs_review: boolean;
  import_batch_id: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface SiteSettings {
  business_name: string;
  whatsapp_number: string | null;
  instagram_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_address: string | null;
  announcement_text: string | null;
  announcement_enabled: boolean;
  about_text: string | null;
  delivery_text: string | null;
  returns_text: string | null;
  hero_headline: string | null;
  hero_subtext: string | null;
}
