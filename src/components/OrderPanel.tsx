"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Price } from "./Price";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import { UNIT_LABEL } from "@/lib/money";
import { buildEnquiryMessage, buildWhatsappUrl } from "@/lib/whatsapp";
import type { AvailabilityStatus, PricingUnit, ProductVariant } from "@/lib/types";

interface Props {
  name: string;
  sku: string | null;
  priceKobo: number | null;
  unit: PricingUnit | null;
  minQty: number | null;
  availability: AvailabilityStatus;
  variants: ProductVariant[];
  productUrl: string;
  whatsappNumber: string | null;
}

const MAX_QTY = 10000;

export function OrderPanel(p: Props) {
  const min = p.minQty ?? 1;
  const [variantId, setVariantId] = useState<string>(p.variants.length === 1 ? p.variants[0].id : "");
  const [qtyText, setQtyText] = useState(String(min));
  const [touched, setTouched] = useState(false);

  const variant = p.variants.find((v) => v.id === variantId) ?? null;
  const groupKinds = [...new Set(p.variants.map((v) => v.kind))];
  const needsVariant = p.variants.length > 1 && !variant;

  const qty = Number(qtyText);
  const qtyError =
    qtyText.trim() === "" || !Number.isFinite(qty)
      ? "Enter a quantity."
      : qty < min
        ? `The minimum order is ${min}${p.unit ? ` ${UNIT_LABEL[p.unit].replace("per ", "")}` : ""}.`
        : qty > MAX_QTY
          ? "Please enter a smaller quantity."
          : null;
  const variantError = needsVariant ? `Please choose an option${groupKinds.length === 1 ? ` (${groupKinds[0]})` : ""}.` : null;

  const effectivePrice = variant?.price_kobo ?? p.priceKobo;
  const effectiveAvail = variant?.availability ?? p.availability;
  const soldOut = effectiveAvail === "sold_out";

  const href = useMemo(() => {
    if (qtyError || variantError) return null;
    const msg = buildEnquiryMessage({
      productName: p.name,
      sku: p.sku,
      variantLabel: variant ? `${variant.label}` : null,
      quantity: qty,
      unitLabel: p.unit ? UNIT_LABEL[p.unit] : null,
      productUrl: p.productUrl,
    });
    return buildWhatsappUrl(p.whatsappNumber, msg);
  }, [qtyError, variantError, p, variant, qty]);

  const label = soldOut ? "Ask about this fabric on WhatsApp" : "Order / enquire on WhatsApp";
  const btn =
    "inline-flex h-14 w-full items-center justify-center gap-2 bg-wine px-6 text-xs font-medium uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-wine-deep";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Price kobo={effectivePrice} unit={p.unit} size="lg" />
        <span className="text-sm text-muted">{AVAILABILITY_LABEL[effectiveAvail]}</span>
      </div>

      {p.variants.length > 0 ? (
        <fieldset>
          <legend className="eyebrow mb-3">{groupKinds.length === 1 ? (groupKinds[0] === "colour" ? "Colour" : groupKinds[0] === "size" ? "Size" : "Option") : "Options"}</legend>
          <div className="flex flex-wrap gap-2">
            {p.variants.map((v) => (
              <label
                key={v.id}
                className={`inline-flex min-h-11 cursor-pointer items-center border px-4 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine ${variantId === v.id ? "border-wine bg-wine text-ivory" : "border-line hover:border-wine"} ${v.availability === "sold_out" ? "line-through opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                  className="sr-only"
                />
                {v.label}
              </label>
            ))}
          </div>
          {touched && variantError ? <p role="alert" className="mt-2 text-sm text-warn">{variantError}</p> : null}
        </fieldset>
      ) : null}

      <div>
        <label htmlFor="qty" className="eyebrow mb-2 block">
          Quantity{p.unit ? ` (${UNIT_LABEL[p.unit].replace("per ", "")})` : ""}
        </label>
        <input
          id="qty"
          type="number"
          inputMode="decimal"
          min={min}
          max={MAX_QTY}
          step="any"
          value={qtyText}
          onChange={(e) => setQtyText(e.target.value)}
          aria-invalid={touched && qtyError ? true : undefined}
          aria-describedby={touched && qtyError ? "qty-error" : undefined}
          className="h-12 w-32 border border-line bg-ivory px-3 text-base tabular-nums focus:border-wine focus:outline-none"
        />
        {p.minQty ? <p className="mt-1.5 text-xs text-muted">Minimum order: {p.minQty}</p> : null}
        {touched && qtyError ? <p id="qty-error" role="alert" className="mt-2 text-sm text-warn">{qtyError}</p> : null}
      </div>

      {p.whatsappNumber ? (
        <a
          href={href ?? "#"}
          target={href ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!href) {
              e.preventDefault();
              setTouched(true);
            }
          }}
          className={btn}
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> {label}
        </a>
      ) : (
        <Link href="/contact" className={btn}>
          Contact us to order
        </Link>
      )}
      <p className="text-xs text-muted">
        This opens WhatsApp with your selection. Your order is not placed or paid until we confirm availability, price and delivery with you.
      </p>
    </div>
  );
}
