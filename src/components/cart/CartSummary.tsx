import { CheckCircle2, Lock, Truck } from "lucide-react";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/utils";
import { SHIPPING } from "../../store/CartProvider";
import type { CartTotals } from "../../types/commerce";
import { Button } from "../ui/Button";

/** Progress bar towards the free-shipping threshold, as Temu shows in the cart. */
export function FreeShippingProgress({ totals }: { totals: CartTotals }) {
  const unlocked = totals.subtotal > 0 && totals.amountToFreeShipping === 0;
  const pct = Math.min(100, (totals.subtotal / SHIPPING.freeThreshold) * 100);

  return (
    <div className="rounded-card border border-line bg-white px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-md">
        {unlocked ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-trust" />
            <span className="font-semibold text-trust">You&apos;ve unlocked free shipping</span>
          </>
        ) : (
          <>
            <Truck className="h-4 w-4 shrink-0 text-brand" />
            <span className="text-ink-2">
              Add <strong className="font-semibold text-brand">{formatPrice(totals.amountToFreeShipping)}</strong> more
              for free shipping
            </span>
          </>
        )}
      </p>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-pill bg-line-2">
        <span
          className={cn("block h-full rounded-pill transition-all", unlocked ? "bg-trust" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "trust" | "deal" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-md text-ink-2">{label}</dt>
      <dd
        className={cn(
          "text-md font-medium tabular-nums",
          tone === "trust" && "text-trust",
          tone === "deal" && "text-deal",
          !tone && "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Itemised order totals. Shared by the cart aside and the checkout summary so
 * the two can never disagree about shipping or savings.
 */
export function CartSummary({
  totals,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  footnote,
  className,
}: {
  totals: CartTotals;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  footnote?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card bg-white px-3 py-3.5 md:px-4", className)}>
      <h2 className="text-lg font-bold">Order summary</h2>

      <dl className="mt-2.5 border-b border-line-2 pb-2.5">
        <Row
          label={`Subtotal (${totals.selectedCount} item${totals.selectedCount === 1 ? "" : "s"})`}
          value={formatPrice(totals.subtotal)}
        />
        {totals.savings > 0 && <Row label="Item savings" value={`- ${formatPrice(totals.savings)}`} tone="deal" />}
        <Row
          label="Shipping"
          value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
          tone={totals.shipping === 0 ? "trust" : undefined}
        />
      </dl>

      <div className="flex items-baseline justify-between gap-3 py-2.5">
        <span className="text-md font-bold text-ink">Order total</span>
        <span className="text-2xl font-extrabold tabular-nums text-brand">{formatPrice(totals.total)}</span>
      </div>

      <Button block size="xl" onClick={onCta} disabled={ctaDisabled} loading={ctaLoading}>
        {ctaLabel}
      </Button>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-3">
        <Lock className="h-3.5 w-3.5" />
        {footnote ?? "Secure checkout \u00B7 Encrypted payment"}
      </p>
    </div>
  );
}
