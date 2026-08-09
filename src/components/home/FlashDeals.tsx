import { Zap } from "lucide-react";
import { useCountdown, useNextHour } from "../../hooks/useCountdown";
import type { Product } from "../../types/product";
import { ProductRail } from "../product/ProductGrid";
import { SectionHeader } from "../ui/SectionHeader";

/** `12 : 04 : 33` timer chip used by the deals sections. */
export function CountdownChip({ target }: { target: Date }) {
  const { hours, minutes, seconds } = useCountdown(target);
  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums" aria-label="Time remaining">
      {[hours, minutes, seconds].map((part, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className="text-deal">:</span>}
          <span className="rounded bg-ink px-1.5 py-1 text-sm text-white">{part}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Lightning deals: products tagged `flash-sale` / `Limited Offer` in Firestore,
 * presented in Temu's horizontal deal rail with an hourly countdown.
 */
export function FlashDeals({ products }: { products: Product[] }) {
  const target = useNextHour();
  if (!products.length) return null;

  return (
    <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
      <SectionHeader
        title={
          <>
            <Zap className="h-5 w-5 text-deal" fill="currentColor" />
            Lightning deals
          </>
        }
        subtitle="Prices reset at the top of every hour"
        to="/search?promo=flash-sale"
        accessory={<CountdownChip target={target} />}
      />
      <ProductRail products={products} />
    </section>
  );
}
