import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { formatPercent } from "../../lib/format";

type Tone = "deal" | "brand" | "trust" | "dark" | "muted" | "lightning";

const TONES: Record<Tone, string> = {
  deal: "bg-deal text-white",
  brand: "bg-brand text-white",
  trust: "bg-trust/10 text-trust",
  dark: "bg-ink text-white",
  muted: "bg-surface-sunken text-ink-2",
  lightning: "bg-brand-100 text-brand-700",
};

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-bold leading-none",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The red `-42%` chip Temu overlays on discounted product cards. */
export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
  if (percent < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded bg-deal px-1 py-[2px] text-2xs font-bold leading-none text-white",
        className,
      )}
    >
      -{formatPercent(percent)}
    </span>
  );
}

/** Temu labels every promo with a coloured pill; map the Firestore tags to tones. */
const PROMO_TONES: Record<string, Tone> = {
  "flash-sale": "deal",
  "Limited Offer": "deal",
  "Best Seller": "brand",
  "Style Pick": "lightning",
};

const PROMO_LABELS: Record<string, string> = { "flash-sale": "Lightning deal" };

export function PromoTag({ tag, className }: { tag: string; className?: string }) {
  return (
    <Badge tone={PROMO_TONES[tag] ?? "lightning"} className={className}>
      {PROMO_LABELS[tag] ?? tag}
    </Badge>
  );
}
