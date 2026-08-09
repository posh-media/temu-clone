import { Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatRating } from "../../lib/format";

const SIZES = { xs: "h-3 w-3", sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

/**
 * Five stars with partial fill, matching Temu's amber star row. The fractional
 * star is produced by clipping a filled star over an outlined one.
 */
export function Rating({
  value,
  size = "sm",
  className,
  showValue = false,
  count,
}: {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
  showValue?: boolean;
  count?: number;
}) {
  const safe = Math.max(0, Math.min(value, 5));
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`Rated ${formatRating(safe)} out of 5`}
    >
      <span className="inline-flex items-center gap-[1px]">
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.max(0, Math.min(1, safe - index));
          return (
            <span key={index} className="relative inline-block" aria-hidden>
              <Star className={cn(SIZES[size], "text-line")} strokeWidth={1.5} fill="currentColor" />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className={cn(SIZES[size], "text-[#FFA700]")} strokeWidth={1.5} fill="currentColor" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && <span className="text-sm font-medium text-ink-2">{formatRating(safe)}</span>}
      {count !== undefined && count > 0 && <span className="text-sm text-ink-3">({count})</span>}
    </span>
  );
}
