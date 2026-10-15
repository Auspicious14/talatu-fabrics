import { z } from "zod";
import { parseNairaToKobo } from "./money";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Keep this under ${max} characters.`).nullable());

const nairaField = z
  .preprocess(emptyToNull, z.string().trim().nullable())
  .transform((v, ctx) => {
    const kobo = parseNairaToKobo(v);
    if (kobo === undefined) {
      ctx.addIssue({ code: "custom", message: "Enter a valid naira amount (up to 2 decimals)." });
      return z.NEVER;
    }
    return kobo;
  });

export const availabilityEnum = z.enum(["available", "made_to_order", "sold_out", "unconfirmed"]);
export const publicationEnum = z.enum(["draft", "published", "archived"]);
export const unitEnum = z.enum(["yard", "set", "piece", "bundle", "roll"]);

export const variantSchema = z.object({
  kind: z.enum(["colour", "size", "other"]),
  label: z.string().trim().min(1, "Option name is required.").max(80),
  priceNaira: nairaField,
  availability: z.preprocess(emptyToNull, availabilityEnum.nullable()),
});

export const productSchema = z.object({
  name: optText(160),
  sku: optText(64),
  slug: z.preprocess(
    emptyToNull,
    z.string().trim().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.").nullable(),
  ),
  category_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  short_description: optText(280),
  description: optText(8000),
  priceNaira: nairaField,
  pricing_unit: z.preprocess(emptyToNull, unitEnum.nullable()),
  min_order_qty: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().positive("Must be greater than 0.").max(100000).nullable(),
  ),
  stock_quantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int("Whole numbers only.").min(0).max(1000000).nullable(),
  ),
  availability: availabilityEnum,
  publication_status: publicationEnum,
  featured: z.boolean(),
  needs_review: z.boolean(),
  instagram_url: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).regex(/^https:\/\/(www\.)?instagram\.com\//, "Must be an https://instagram.com/... link.").nullable(),
  ),
  internal_notes: optText(4000),
  variants: z.array(variantSchema).max(40),
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductParsed = z.output<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  description: optText(500),
  is_public: z.boolean(),
});

export const settingsSchema = z.object({
  business_name: z.string().trim().min(1).max(80),
  whatsapp_number: z.preprocess(emptyToNull, z.string().trim().max(30).nullable()),
  instagram_url: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).regex(/^https:\/\/(www\.)?instagram\.com\//, "Must be an https://instagram.com/... link.").nullable(),
  ),
  contact_email: z.preprocess(emptyToNull, z.string().trim().email("Enter a valid email.").max(120).nullable()),
  contact_phone: optText(40),
  business_address: optText(300),
  announcement_text: optText(160),
  announcement_enabled: z.boolean(),
  hero_headline: optText(120),
  hero_subtext: optText(300),
  about_text: optText(4000),
  delivery_text: optText(4000),
  returns_text: optText(4000),
});
