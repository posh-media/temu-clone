import { Flame, Heart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCompact } from "../../lib/format";
import { cn } from "../../lib/utils";
import { useCart } from "../../store/CartProvider";
import { useFavorites } from "../../store/FavoritesProvider";
import { useFlashSale } from "../../store/FlashSaleProvider";
import { useToast } from "../../store/ToastProvider";
import type { HydratedCartLine } from "../../types/commerce";
import { Badge, DiscountBadge } from "../ui/Badge";
import { PriceDisplay } from "../ui/PriceDisplay";
import { SmartImage } from "../ui/SmartImage";
import { QuantityStepper } from "../product/QuantityStepper";

/** One cart line: selection checkbox, thumbnail, price, stepper and actions. */
export function CartItem({ line }: { line: HydratedCartLine }) {
  const { setQty, remove, toggleSelected } = useCart();
  const favorites = useFavorites();
  const flashSale = useFlashSale();
  const { toast } = useToast();
  const { product } = line;

  const isPromo = flashSale.isPromoProduct(product.id);
  const maxQty = isPromo ? 1 : Math.max(1, Math.min(product.availableStock || 99, 99));
  const unitPrice = Math.round(line.lineTotal / Math.max(1, line.qty));

  return (
    <li className="flex gap-2.5 border-b border-line-2 py-3 last:border-b-0 md:gap-3">
      <label className="flex shrink-0 items-start pt-1">
        <span className="sr-only">Select {product.name} for checkout</span>
        <input
          type="checkbox"
          checked={line.selected}
          onChange={() => toggleSelected(product.id)}
          className="h-[18px] w-[18px] cursor-pointer rounded-[4px] border-line accent-brand"
        />
      </label>

      <Link to={`/product/${product.id}`} className="shrink-0">
        <SmartImage
          src={product.images[0]}
          alt={product.name}
          wrapperClassName="h-[88px] w-[88px] rounded-card bg-surface-sunken md:h-[104px] md:w-[104px]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/product/${product.id}`} className="group min-w-0">
          <h3 className="clamp-2 text-md text-ink group-hover:text-brand">{product.name}</h3>
        </Link>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
          {product.brand && <span>{product.brand}</span>}
          {product.soldQuantity > 0 && <span>{formatCompact(product.soldQuantity)}+ sold</span>}
          {isPromo && (
            <Badge tone="deal" className="px-1.5 py-0.5 text-[10px]">
              <Flame className="h-2.5 w-2.5" fill="currentColor" /> Flash sale
            </Badge>
          )}
        </p>

        {product.lowStock && !isPromo && (
          <p className="mt-0.5 text-xs font-semibold text-deal">Only {product.availableStock} left</p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriceDisplay
              price={unitPrice}
              listPrice={product.price}
              size="md"
              tone={isPromo ? "deal" : undefined}
            />
            {!isPromo && <DiscountBadge percent={product.discountPercent} />}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Save ${product.name} to favorites`}
              onClick={() =>
                toast(favorites.toggle(product.id) ? "Saved to your favorites" : "Removed from favorites", "info")
              }
              className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-muted"
            >
              <Heart
                className={cn("h-[17px] w-[17px]", favorites.has(product.id) && "text-deal")}
                fill={favorites.has(product.id) ? "currentColor" : "none"}
              />
            </button>
            <button
              type="button"
              aria-label={`Remove ${product.name} from cart`}
              onClick={() => {
                remove(product.id);
                toast("Removed from cart", "info");
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-muted hover:text-deal"
            >
              <Trash2 className="h-[17px] w-[17px]" />
            </button>
            <QuantityStepper
              value={line.qty}
              onChange={(qty) => setQty(product.id, qty)}
              max={maxQty}
              size="sm"
              label={`Quantity for ${product.name}`}
              disabled={isPromo}
            />
          </div>
        </div>
      </div>
    </li>
  );
}
