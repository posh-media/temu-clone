import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatPercent } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { Product } from "../../types/product";
import { Button } from "../ui/Button";
import { SmartImage } from "../ui/SmartImage";

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  product?: Product;
  theme: string;
}

const AUTOPLAY_MS = 5500;

/**
 * Full-width hero carousel. Slides are generated from real catalogue data (the
 * deepest discount, the best seller, the newest arrival) so the banner always
 * links somewhere real instead of being a static image.
 */
export function HeroCarousel({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const slides = useMemo<Slide[]>(() => {
    const byDiscount = [...products].sort((a, b) => b.discountPercent - a.discountPercent)[0];
    const bySold = [...products].sort((a, b) => b.soldQuantity - a.soldQuantity)[0];
    const byNew = [...products].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0];

    return [
      {
        eyebrow: "Lightning deals",
        title: byDiscount ? `Up to ${formatPercent(byDiscount.discountPercent)} off today` : "Up to 90% off today",
        body: "New prices drop every hour. Grab them before the timer runs out.",
        cta: "Shop the deals",
        to: "/search?promo=flash-sale",
        product: byDiscount,
        theme: "from-[#FF7A18] to-[#FFB347]",
      },
      {
        eyebrow: "Best sellers",
        title: "Loved by thousands of shoppers",
        body: bySold ? `${bySold.name} and more of this week's most-bought picks.` : "This week's most-bought picks.",
        cta: "Shop best sellers",
        to: "/search?sort=best-selling",
        product: bySold,
        theme: "from-[#0F172A] to-[#3B4A6B]",
      },
      {
        eyebrow: "Just landed",
        title: "Fresh arrivals, everyday prices",
        body: "Brand new listings added to the catalogue - be the first to try them.",
        cta: "Shop new in",
        to: "/search?sort=newest",
        product: byNew,
        theme: "from-[#0A8800] to-[#4FBF4A]",
      },
    ];
  }, [products]);

  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const go = (next: number) => setIndex(((next % count) + count) % count);
  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative overflow-hidden rounded-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      <div className={cn("bg-gradient-to-r", slide.theme)}>
        <div className="flex items-center gap-4 px-5 py-6 sm:px-8 md:min-h-[230px] md:py-8 lg:min-h-[260px]">
          <div className="min-w-0 flex-1 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{slide.eyebrow}</p>
            <h2 className="mt-1.5 text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">{slide.title}</h2>
            <p className="mt-2 max-w-md text-sm text-white/90 sm:text-md">{slide.body}</p>
            <Link to={slide.to} className="mt-4 inline-block">
              <Button size="lg" className="bg-white text-ink hover:bg-white/90">
                {slide.cta}
              </Button>
            </Link>
          </div>

          {slide.product && (
            <Link
              to={`/product/${slide.product.id}`}
              className="hidden shrink-0 sm:block"
              aria-label={slide.product.name}
            >
              <SmartImage
                src={slide.product.images[0]}
                alt={slide.product.name}
                eager
                wrapperClassName="h-[150px] w-[150px] rounded-xl bg-white/10 md:h-[190px] md:w-[190px]"
                className="object-contain p-2"
              />
            </Link>
          )}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-card hover:bg-white md:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-card hover:bg-white md:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-1.5 rounded-pill transition-all",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
