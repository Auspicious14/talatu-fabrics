import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { SectionHeading } from "@/components/SectionHeading";
import { getCategories, getFeatured, getNewArrivals, getSettings } from "@/lib/data/catalogue";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export default async function HomePage() {
  const [settings, categories, featured, arrivals] = await Promise.all([
    getSettings(),
    getCategories(),
    getFeatured(4),
    getNewArrivals(8),
  ]);

  const heroImage = featured[0]?.images[0] ?? arrivals[0]?.images[0];
  const heroProduct = featured[0] ?? arrivals[0];
  const wa = buildWhatsappUrl(settings.whatsapp_number, "Hello Talatu Fabrics, I'd like to enquire about your fabrics.");
  const headline = settings.hero_headline ?? "Fabrics chosen for the moments that matter";
  const subtext =
    settings.hero_subtext ?? "Premium lace and occasion fabrics. Browse the collection, then enquire directly on WhatsApp.";

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-12">
          <div className="flex flex-col justify-center px-5 py-14 sm:py-20 lg:col-span-6 lg:px-8 lg:py-28">
            <p className="eyebrow mb-5">{settings.business_name}</p>
            <h1 className="max-w-xl text-5xl sm:text-6xl lg:text-7xl">{headline}</h1>
            <div className="hairline my-7 max-w-24" />
            <p className="max-w-md text-lg text-muted">{subtext}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center gap-2 bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-wine-deep"
              >
                Explore the collection <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 border border-wine px-6 text-xs font-medium uppercase tracking-[0.18em] text-wine transition-colors hover:bg-wine hover:text-ivory"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden /> Chat on WhatsApp
                </a>
              ) : null}
            </div>
          </div>
          <div className="relative min-h-[26rem] bg-cream lg:col-span-6 lg:min-h-[40rem]">
            {heroImage && heroProduct?.slug ? (
              <Link href={`/shop/${heroProduct.slug}`} className="absolute inset-0 block" aria-label={`View ${heroProduct.name ?? "featured fabric"}`}>
                <ProductImage
                  path={heroImage.storage_path}
                  alt={heroImage.alt_text || heroProduct.name || "Featured fabric"}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                />
              </Link>
            ) : (
              <div className="no-photo absolute inset-0 flex items-center justify-center p-10 text-center">
                <p className="font-serif text-3xl italic text-wine/70">The collection is being prepared</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <SectionHeading eyebrow="Collections" title="Shop by category" />
          <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id} className="bg-ivory">
                <Link
                  href={`/shop?category=${c.slug}`}
                  className="group flex h-full min-h-32 flex-col justify-between p-5 transition-colors hover:bg-cream"
                >
                  <span className="font-serif text-2xl group-hover:text-wine">{c.name}</span>
                  <span className="mt-6 inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-gold-text">
                    Browse <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Featured */}
      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <SectionHeading eyebrow="Curated" title="Featured fabrics" href="/shop" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* New arrivals */}
      {arrivals.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <SectionHeading eyebrow="Just in" title="New arrivals" href="/shop?sort=newest" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {arrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Brand intro: only shows text the owner has supplied. */}
      {settings.about_text ? (
        <section className="bg-cream">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center lg:px-8">
            <p className="eyebrow mb-4">About us</p>
            <p className="font-serif text-3xl leading-snug sm:text-4xl">{settings.about_text.split("\n")[0]}</p>
            <Link href="/about" className="mt-8 inline-block border-b border-wine pb-0.5 text-sm text-wine">
              Read more
            </Link>
          </div>
        </section>
      ) : null}

      {/* Enquiry CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="border border-wine px-6 py-14 text-center sm:px-12">
          <p className="eyebrow mb-3">Order with us</p>
          <h2 className="mx-auto max-w-2xl text-4xl sm:text-5xl">Found something you love? Ask us on WhatsApp.</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Send us the fabric you like and we will confirm availability, total price and delivery with you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Start a WhatsApp chat
              </a>
            ) : (
              <Link
                href="/contact"
                className="inline-flex h-12 items-center bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep"
              >
                Contact us
              </Link>
            )}
            {settings.instagram_url ? (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center border border-line px-6 text-xs font-medium uppercase tracking-[0.18em] hover:border-wine hover:text-wine"
              >
                See us on Instagram
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
