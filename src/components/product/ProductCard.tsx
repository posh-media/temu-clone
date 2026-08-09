import { Heart, ShoppingCart, Truck } from "lucide-react";
import { memo, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { formatCompact, formatRating } from "../../lib/format";
import { cn } from "../../lib/utils";
import { useCart } from "../../store/CartProvider";
import { useFavorites } from "../../store/FavoritesProvider";
import { useToast } from "../../store/ToastProvider";
import type { Product } from "../../types/product";
import { DiscountBadge } from "../ui/Badge";
import { PriceDisplay } from "../ui/PriceDisplay";
import { SmartImage } from "../ui/SmartImage";
import { Rating } from "../ui/Rating";
import { SHIPPING } from "../../store/CartProvider";

export type ProductCardVariant = "grid" | "compact" | "rail";

/**
 * The single card used by every product surface (home feed, search results,
 * related rails). Anatomy follows Temu: square image with hover affordances,
 * then price, then a 2-line title, then the social-proof row.
 */
export const ProductCard = memo(function ProductCard({
  product,
  variant = "grid",
  eager = false,
  className,
}: {
  product: Product;
  variant?: ProductCardVariant;
  eager?: boolean;
  className?: string;
}) {
  const { add } = useCart();
  const favorites = useFavorites();
  const { toast } = useToast();
  const isFavorite = favorites.has(product.id);
  const freeShipping = product.price >= SHIPPING.freeThreshold;
  const compact = variant === "compact";

  const onQuickAdd = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    add(product, 1);
    toast("Added to cart");
  };

  const onToggleFavorite = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toast(favorites.toggle(product.id) ? "Saved to your favorites" : "Removed from favorites", "info");
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card bg-white transition-shadow duration-200 hover:shadow-hover",
        variant === "rail" && "w-[150px] shrink-0 md:w-[170px]",
        className,
      )}
    >
      <Link to={`/product/${product.id}`} className="flex flex-1 flex-col focus-visible:ring-inset">
        <div className="relative">
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            eager={eager}
            wrapperClassName="aspect-square w-full rounded-card bg-surface-sunken"
            className="transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 25vw, 17vw"
          />

          {/* Top-left promo ribbon, matching Temu's overlay chips. */}
          <div className="pointer-events-none absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
            {product.promotionalTags.includes("Best Seller") && (
              <span className="rounded bg-brand px-1.5 py-[3px] text-2xs font-bold text-white">Best Seller</span>
            )}
            {product.promotionalTags.includes("flash-sale") && (
              <span className="rounded bg-deal px-1.5 py-[3px] text-2xs font-bold text-white">Lightning deal</span>
            )}
          </div>

          {product.lowStock && (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-[3px] text-2xs font-semibold text-white">
              Almost sold out
            </span>
          )}

          {/* Hover affordances: desktop only, so touch targets stay clean. */}
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
            aria-pressed={isFavorite}
            className={cn(
              "absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-card backdrop-blur transition-opacity",
              "md:opacity-0 md:group-hover:opacity-100",
              isFavorite && "md:opacity-100",
            )}
          >
            <Heart
              className={cn("h-[17px] w-[17px]", isFavorite ? "text-deal" : "text-ink-2")}
              fill={isFavorite ? "currentColor" : "none"}
              strokeWidth={2}
            />
          </button>

          {!compact && (
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label={`Add ${product.name} to cart`}
              className="absolute bottom-1.5 right-1.5 hidden h-9 w-9 place-items-center rounded-full bg-brand text-white shadow-card transition-opacity md:grid md:opacity-0 md:group-hover:opacity-100"
            >
              <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </button>
          )}
        </div>

        <div className={cn("flex flex-1 flex-col gap-1 px-1.5 pb-2 pt-2", compact && "px-1 pt-1.5")}>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <PriceDisplay
              price={product.price}
              listPrice={product.listPrice}
              size={compact ? "sm" : "md"}
              showList={!compact}
            />
            {!compact && <DiscountBadge percent={product.discountPercent} />}
          </div>

          <h3 className={cn("clamp-2 text-sm font-normal text-ink-2", compact && "clamp-1 text-xs")}>
            {product.name}
          </h3>

          {!compact && (
            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
              {product.rating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Rating value={product.rating} size="xs" />
                  <span className="text-xs text-ink-3">{formatRating(product.rating)}</span>
                </span>
              )}
              {product.soldQuantity > 0 && (
                <span className="text-xs text-ink-3">{formatCompact(product.soldQuantity)}+ sold</span>
              )}
            </div>
          )}

          {!compact && freeShipping && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-trust">
              <Truck className="h-3.5 w-3.5" strokeWidth={2} />
              Free shipping
            </span>
          )}
        </div>
      </Link>
    </article>
  );
});
