import { BadgeCheck, Clock3, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { formatPrice } from "../../lib/format";
import { SHIPPING } from "../../store/CartProvider";

/**
 * The row of guarantee claims Temu shows under its header (and repeats on the
 * PDP). Values come from the shipping constants so nothing contradicts the cart.
 */
export const TRUST_ITEMS = [
  { icon: Truck, label: "Free shipping", detail: `On orders over ${formatPrice(SHIPPING.freeThreshold, { decimals: false })}` },
  { icon: RotateCcw, label: "Free returns", detail: "Within 90 days" },
  { icon: ShieldCheck, label: "Secure payments", detail: "Encrypted at checkout" },
  { icon: Clock3, label: "Delivery guarantee", detail: "Refund if late" },
  { icon: BadgeCheck, label: "Price adjustment", detail: "Within 30 days" },
] as const;

export function TrustBar() {
  return (
    <div className="hidden border-t border-line-2 bg-white lg:block">
      <ul className="shell flex items-center justify-center gap-7 py-1.5">
        {TRUST_ITEMS.map(({ icon: Icon, label, detail }) => (
          <li key={label} className="group flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-trust" strokeWidth={2} />
            <span className="text-sm font-medium text-ink-2">{label}</span>
            <span className="text-sm text-ink-4">&middot; {detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact three-up version used on the product detail page. */
export function TrustStrip() {
  return (
    <ul className="grid grid-cols-3 gap-2 rounded-card bg-surface-muted px-3 py-2.5">
      {TRUST_ITEMS.slice(0, 3).map(({ icon: Icon, label, detail }) => (
        <li key={label} className="flex flex-col items-center gap-1 text-center">
          <Icon className="h-[18px] w-[18px] text-trust" strokeWidth={2} />
          <span className="text-xs font-semibold text-ink-2">{label}</span>
          <span className="text-2xs text-ink-4">{detail}</span>
        </li>
      ))}
    </ul>
  );
}
