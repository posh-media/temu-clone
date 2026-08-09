import { Gift, PackageCheck, Percent, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../lib/format";
import { SHIPPING } from "../../store/CartProvider";
import type { Product } from "../../types/product";
import { SmartImage } from "../ui/SmartImage";

/**
 * The row of promotional tiles Temu places between product sections. Each tile
 * previews four real products so it never looks like empty chrome.
 */
export function PromoCards({ products }: { products: Product[] }) {
  const cards = [
    {
      icon: Truck,
      title: "Free shipping",
      body: `On every order over ${formatPrice(SHIPPING.freeThreshold, { decimals: false })}`,
      to: "/search?sort=price-desc",
      accent: "bg-trust/10 text-trust",
      picks: products.filter((p) => p.price >= SHIPPING.freeThreshold).slice(0, 4),
    },
    {
      icon: Percent,
      title: "Clearance",
      body: "Biggest discounts in the catalogue",
      to: "/search?sort=discount",
      accent: "bg-deal/10 text-deal",
      picks: [...products].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 4),
    },
    {
      icon: PackageCheck,
      title: "Almost gone",
      body: "Low stock, going fast",
      to: "/search?sort=best-selling",
      accent: "bg-brand-100 text-brand-700",
      picks: products.filter((p) => p.lowStock).slice(0, 4),
    },
    {
      icon: Gift,
      title: "Top rated",
      body: "Loved by verified shoppers",
      to: "/search?sort=top-rated",
      accent: "bg-ink/5 text-ink-2",
      picks: [...products].sort((a, b) => b.rating - a.rating).slice(0, 4),
    },
  ].filter((card) => card.picks.length > 0);

  if (!cards.length) return null;

  return (
    <section aria-label="Promotions" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ icon: Icon, title, body, to, accent, picks }) => (
        <Link
          key={title}
          to={to}
          className="group rounded-card bg-white p-3 transition-shadow hover:shadow-hover"
        >
          <div className="flex items-center gap-2">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${accent}`}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-md font-bold text-ink group-hover:text-brand">{title}</span>
              <span className="block truncate text-xs text-ink-3">{body}</span>
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {picks.map((product) => (
              <SmartImage
                key={product.id}
                src={product.images[0]}
                alt={product.name}
                wrapperClassName="aspect-square w-full rounded bg-surface-sunken"
              />
            ))}
          </div>
        </Link>
      ))}
    </section>
  );
}
