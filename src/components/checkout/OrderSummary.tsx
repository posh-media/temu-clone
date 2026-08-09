import { Link } from "react-router-dom";
import { formatPrice } from "../../lib/format";
import type { HydratedCartLine } from "../../types/commerce";
import { SmartImage } from "../ui/SmartImage";

/** Compact itemised list of the lines being purchased. */
export function OrderLineList({ lines, linkToProduct = true }: { lines: HydratedCartLine[]; linkToProduct?: boolean }) {
  return (
    <ul className="divide-y divide-line-2">
      {lines.map((line) => {
        const content = (
          <>
            <SmartImage
              src={line.product.images[0]}
              alt={line.product.name}
              wrapperClassName="h-14 w-14 shrink-0 rounded bg-surface-sunken"
            />
            <span className="min-w-0 flex-1">
              <span className="clamp-2 block text-sm text-ink">{line.product.name}</span>
              <span className="mt-0.5 block text-xs text-ink-3">Qty {line.qty}</span>
            </span>
            <span className="shrink-0 text-md font-semibold tabular-nums text-ink">
              {formatPrice(line.lineTotal)}
            </span>
          </>
        );

        return (
          <li key={`${line.productId}-${line.variation ?? ""}`} className="py-2.5 first:pt-0 last:pb-0">
            {linkToProduct ? (
              <Link to={`/product/${line.product.id}`} className="flex items-start gap-2.5 hover:opacity-90">
                {content}
              </Link>
            ) : (
              <div className="flex items-start gap-2.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
