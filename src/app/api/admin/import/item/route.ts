import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/images";
import { ingestImage } from "@/lib/import/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const csvSchema = z.object({
  name: z.string().max(160).nullish(), sku: z.string().max(64).nullish(), priceKobo: z.number().int().min(0).nullish(),
  pricingUnit: z.enum(["yard", "set", "piece", "bundle", "roll"]).nullish(), category: z.string().max(80).nullish(),
  description: z.string().max(8000).nullish(), availability: z.enum(["available", "made_to_order", "sold_out", "unconfirmed"]).nullish(),
  colours: z.array(z.string().max(80)).max(20).optional(), instagramUrl: z.string().max(300).regex(/^https:\/\/(www\.)?instagram\.com\//).nullish(),
  line: z.number().int().optional(), warnings: z.array(z.string().max(300)).max(10).optional(),
});
const metaSchema = z.object({
  batchId: z.string().uuid(), filename: z.string().min(1).max(300),
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/).nullish(), groupKey: z.string().max(120).nullish(),
  caption: z.string().max(5000).nullish(), csv: csvSchema.nullish(),
});

/** One image per request (keeps each request under serverless body limits and makes retries trivial). */
export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = form.get("file");
  const metaRaw = form.get("meta");
  if (!(file instanceof File) || typeof metaRaw !== "string") return NextResponse.json({ error: "Missing file or metadata." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image is larger than 8 MB." }, { status: 413 });

  let meta;
  try { meta = metaSchema.parse(JSON.parse(metaRaw)); } catch { return NextResponse.json({ error: "Invalid metadata." }, { status: 400 }); }

  const { data: batch } = await ctx.supabase.from("import_batches").select("id").eq("id", meta.batchId).maybeSingle();
  if (!batch) return NextResponse.json({ error: "Unknown import batch." }, { status: 404 });

  const result = await ingestImage(ctx.supabase, Buffer.from(await file.arrayBuffer()), {
    batchId: meta.batchId, filename: meta.filename, sourceHash: meta.sourceHash ?? null, groupKey: meta.groupKey ?? null,
    caption: meta.caption ?? null, csv: meta.csv ?? null,
  });
  return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
}
