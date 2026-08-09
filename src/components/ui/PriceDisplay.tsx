import { cn } from "../../lib/utils";
import { formatPrice, splitPrice } from "../../lib/format";

type Size = "sm" | "md" | "lg" | "xl";

const CURRENT: Record<Size, string> = {
  sm: "text-md",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
};
const SYMBOL: Record<Size, string> = { sm: "text-2xs", md: "text-xs", lg: "text-base", xl: "text-lg" };
const FRACTION: Record<Size, string> = { sm: "text-2xs", md: "text-xs", lg: "text-base", xl: "text-lg" };

/**
 * Temu's price treatment: a small currency symbol, a large bold figure with a
 * smaller decimal part, and the crossed-out original price beside it.
 * `tone="deal"` is the red styling used on flash-deal cards.
 */
export function PriceDisplay({
  price,
  listPrice,
  size = "md",
  tone = "brand",
  className,
  showList = true,
}: {
  price: number;
  listPrice?: number;
  size?: Size;
  tone?: "brand" | "deal" | "ink";
  className?: string;
  showList?: boolean;
}) {
  const { symbol, whole, fraction } = splitPrice(price);
  const color = tone === "deal" ? "text-deal" : tone === "ink" ? "text-ink" : "text-brand";
  const hasList = showList && listPrice !== undefined && listPrice > price + 0.5;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span className={cn("font-bold leading-none", color)}>
        <span className={SYMBOL[size]}>{symbol}</span>
        <span className={CURRENT[size]}>{whole}</span>
        <span className={FRACTION[size]}>.{fraction}</span>
      </span>
      {hasList && (
        <span className="text-sm font-normal text-ink-4 line-through">{formatPrice(listPrice)}</span>
      )}
    </span>
  );
}
