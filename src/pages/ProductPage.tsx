import {
  ChevronRight, Flame, Heart, PackageSearch, Share2, Store, Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductRail } from "../components/product/ProductGrid";
import { ProductReviews } from "../components/product/ProductReviews";
import { QuantityStepper } from "../components/product/QuantityStepper";
import { FlashSaleModal } from "../components/product/FlashSaleModal";
import { TrustStrip } from "../components/layout/TrustBar";
import { categoryPath } from "../components/layout/CategoryNav";
import { Badge, DiscountBadge, PromoTag } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { PriceDisplay } from "../components/ui/PriceDisplay";
import { ProductPageSkeleton } from "../components/ui/Skeleton";
import { Rating } from "../components/ui/Rating";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SmartImage } from "../components/ui/SmartImage";
import { useProduct, useRecommended, useRelatedProducts } from "../hooks/useCatalogue";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { addDays, formatCompact, formatPrice, formatShortDate } from "../lib/format";
import { parseFlashSalePrice } from "../lib/flashSale";
import { cn } from "../lib/utils";
import { SHIPPING, useCart } from "../store/CartProvider";
import { useFavorites } from "../store/FavoritesProvider";
import { useFlashSale } from "../store/FlashSaleProvider";
import { useToast } from "../store/ToastProvider";
import type { Product } from "../types/product";

const RECENTLY_VIEWED_LIMIT = 12;

/** Collapsible information block used for description / specs / box contents. */
function InfoBlock({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-line-2 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-md font-bold text-ink">
        {title}
        <ChevronRight className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-90" />
      </summary>
      <div className="pb-3.5">{children}</div>
    </details>
  );
}

/** Delivery window shown under the CTA, derived from stock availability. */
function DeliveryEstimate({ product }: { product: Product }) {
  const now = new Date();
  const from = addDays(now, product.availableStock > 0 ? 4 : 8);
  const to = addDays(now, product.availableStock > 0 ? 9 : 16);
  const freeShipping = product.price >= SHIPPING.freeThreshold;

  return (
    <div className="space-y-1.5 rounded-card border border-line bg-surface-muted px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-md">
        <Truck className="h-4 w-4 shrink-0 text-trust" strokeWidth={2} />
        <span className="font-semibold text-trust">
          {freeShipping ? "Free standard shipping" : `Shipping ${formatPrice(SHIPPING.flatRate)}`}
        </span>
      </p>
      <p className="pl-[22px] text-sm text-ink-2">
        Estimated delivery{" "}
        <strong className="font-semibold text-ink">
          {formatShortDate(from)} &ndash; {formatShortDate(to)}
        </strong>
      </p>
      {!freeShipping && (
        <p className="pl-[22px] text-sm text-ink-3">
          Add {formatPrice(SHIPPING.freeThreshold - product.price)} more to qualify for free shipping.
        </p>
      )}
      <p className="pl-[22px] text-sm text-ink-3">Free 90-day returns &middot; Delivery guarantee</p>
    </div>
  );
}

/** Key/value spec table assembled only from fields the document actually has. */
function SpecTable({ product }: { product: Product }) {
  const rows = [
    ["Brand", product.brand],
    ["Category", product.category],
    ["Sub category", product.subCategory],
    ["Type", product.productType],
    ["Material", product.material],
    ["Item number", product.id],
    ["Total stock", product.totalStock > 0 ? product.totalStock.toLocaleString() : undefined],
    ["Sold by", product.sellerId?.replace(/^seller_/, "").replace(/_/g, " ")],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  if (!rows.length) return null;

  return (
    <dl className="divide-y divide-line-2 text-md">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 py-2">
          <dt className="w-32 shrink-0 text-ink-3">{label}</dt>
          <dd className="min-w-0 flex-1 capitalize text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(productId);
  const related = useRelatedProducts(product, 16);
  const recommended = useRecommended(`pdp-${productId}`, 30);
  const { add, qtyOf, clear, items } = useCart();
  const favorites = useFavorites();
  const flashSale = useFlashSale();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [, setRecentlyViewed] = useLocalStorage<string[]>("temu-clone:recently-viewed", []);

  const [flashModalOpen, setFlashModalOpen] = useState(false);
  const [guardOpen, setGuardOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => setQty(1), [productId]);

  // Track the visit for the homepage "Recently viewed" rail.
  useEffect(() => {
    if (!product) return;
    setRecentlyViewed((current) =>
      [product.id, ...current.filter((id) => id !== product.id)].slice(0, RECENTLY_VIEWED_LIMIT),
    );
  }, [product, setRecentlyViewed]);

  const flashOffer = useMemo(() => (product ? parseFlashSalePrice(product.promotionalTags, product.price) : null), [product]);

  const isPromoProduct = product ? flashSale.isPromoProduct(product.id) : false;
  const hasActivePromo = isPromoProduct && flashSale.isActive;

  // Effective price: promotional when active, otherwise product price.
  const effectivePrice = useMemo(
    () => (product ? flashSale.getPromoPrice(product.id, product.price) : 0),
    [product, flashSale],
  );

  // Auto-open flash-sale modal when arriving at a product with a valid offer.
  useEffect(() => {
    if (flashOffer && !hasActivePromo && !flashSale.session?.completed) {
      setFlashModalOpen(true);
    }
  }, [flashOffer, hasActivePromo, flashSale.session?.completed]);

  const maxQty = useMemo(
    () => (hasActivePromo ? 1 : Math.max(1, Math.min(product?.availableStock || 99, 99))),
    [hasActivePromo, product?.availableStock],
  );

  // Navigation guard: warn when a flash sale is active and the user tries to leave.
  const blocker = useBlocker(
    ({ nextLocation }) => {
      if (!flashSale.isActive || flashSale.session?.completed) return false;
      if (!product) return false;
      const nextPath = nextLocation.pathname;
      // Allow staying on the same product or entering checkout/payment/orders.
      if (nextPath === `/product/${product.id}` || nextPath.startsWith("/checkout") || nextPath.startsWith("/payment") || nextPath.startsWith("/orders")) {
        return false;
      }
      setGuardOpen(true);
      return true;
    },
  );

  // Close the guard modal when the blocker is unblocked.
  useEffect(() => {
    if (blocker.state === "unblocked") setGuardOpen(false);
  }, [blocker.state]);

  if (isLoading) return <ProductPageSkeleton />;

  if (isError || !product) {
    return (
      <div className="shell py-4">
        <div className="rounded-card bg-white">
          <EmptyState
            icon={PackageSearch}
            title="Product not available"
            description="This item may have been removed from the catalogue."
            action={
              <Link to="/search">
                <Button>Browse all products</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const inCart = qtyOf(product.id);
  const isFavorite = favorites.has(product.id);
  const soldOut = product.availableStock <= 0;

  const addToCart = () => {
    if (flashOffer && !hasActivePromo) {
      setFlashModalOpen(true);
      return;
    }
    if (flashSale.isActive && !isPromoProduct) {
      toast("A flash sale is active for one item only. Leave that flow first.", "error");
      return;
    }
    const ok = add(product, hasActivePromo ? 1 : qty);
    if (ok) {
      toast(`${hasActivePromo ? 1 : qty} item${qty > 1 && !hasActivePromo ? "s" : ""} added to cart`);
    } else {
      toast("This cart is reserved for the active flash-sale item.", "error");
    }
  };

  const buyNow = () => {
    if (flashOffer && !hasActivePromo) {
      setFlashModalOpen(true);
      return;
    }
    if (flashSale.isActive && !isPromoProduct) {
      toast("A flash sale is active for one item only. Leave that flow first.", "error");
      return;
    }
    add(product, hasActivePromo ? 1 : qty);
    navigate("/checkout");
  };

  const claimNow = () => {
    if (!flashOffer || !product) return;
    if (flashSale.session && !flashSale.isPromoProduct(product.id)) {
      toast("You can only claim one flash-sale item at a time.", "error");
      setFlashModalOpen(false);
      return;
    }

    setClaiming(true);
    flashSale.claim(product);

    // A flash-sale cart may only contain the claimed item.
    if (items.some((i) => i.productId !== product.id)) {
      clear();
    }

    add(product, 1);
    flashSale.markCheckoutStarted();
    setClaiming(false);
    setFlashModalOpen(false);
    toast("Flash sale claimed — checkout now", "info");
    navigate("/checkout");
  };

  const guardCheckout = () => {
    setGuardOpen(false);
    blocker.proceed?.();
    navigate("/checkout");
  };

  const guardLeave = () => {
    setGuardOpen(false);
    flashSale.clear();
    blocker.proceed?.();
  };

  return (
    <div className="shell py-3">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 pb-2.5 text-sm text-ink-3 md:flex">
        <Link to="/" className="hover:text-brand">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={categoryPath(product.category)} className="hover:text-brand">{product.category}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-ink-2">{product.name}</span>
      </nav>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Gallery */}
        <div className="rounded-card bg-white p-2 md:p-3">
          <ProductGallery images={product.images} alt={product.name} />
        </div>

        {/* Buy box */}
        <div className="space-y-3">
          <div className="rounded-card bg-white px-3 py-3.5 md:px-4">
            {product.promotionalTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {product.promotionalTags.map((tag) => (
                  <PromoTag key={tag} tag={tag} />
                ))}
              </div>
            )}

            <h1 className="text-lg font-semibold leading-snug text-ink md:text-xl">{product.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {product.rating > 0 && (
                <Link to="#reviews" className="inline-flex items-center gap-1.5 hover:underline">
                  <Rating value={product.rating} size="sm" showValue />
                  <span className="text-sm text-ink-3">({product.reviewCount})</span>
                </Link>
              )}
              {product.soldQuantity > 0 && (
                <span className="text-sm text-ink-3">{formatCompact(product.soldQuantity)}+ sold</span>
              )}
              {product.brand && (
                <Link
                  to={`/search?q=${encodeURIComponent(product.brand)}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {product.brand}
                </Link>
              )}
            </div>

            {/* Price block */}
            <div className="mt-3 rounded-card bg-brand-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <PriceDisplay
                  price={effectivePrice}
                  listPrice={hasActivePromo ? product.price : product.listPrice}
                  size="xl"
                  tone={hasActivePromo ? "deal" : "brand"}
                />
                {!hasActivePromo && <DiscountBadge percent={product.discountPercent} className="px-1.5 py-1 text-xs" />}
                {hasActivePromo && (
                  <Badge tone="deal" className="px-2 py-1 text-xs">
                    <Flame className="h-3 w-3" fill="currentColor" /> Flash sale
                  </Badge>
                )}
              </div>
              {hasActivePromo && product.price > effectivePrice && (
                <p className="mt-1 text-sm font-medium text-deal">
                  You save {formatPrice(product.price - effectivePrice)}
                </p>
              )}
            </div>

            {/* Stock urgency */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {soldOut ? (
                <Badge tone="muted">Out of stock</Badge>
              ) : product.lowStock ? (
                <span className="inline-flex items-center gap-1 text-md font-semibold text-deal">
                  <Flame className="h-4 w-4" fill="currentColor" />
                  Only {product.availableStock} left in stock
                </span>
              ) : (
                <Badge tone="trust">In stock &middot; ready to ship</Badge>
              )}
            </div>

            {/* Quantity + CTAs */}
            <div className="mt-3.5 flex items-center gap-3">
              <span className="text-md font-medium text-ink-2">Quantity</span>
              <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
              <span className="text-sm text-ink-4">
                {soldOut ? "Unavailable" : `${maxQty} available`}
              </span>
            </div>

            <div className="mt-3.5 space-y-2">
              <Button block size="xl" onClick={addToCart} disabled={soldOut}>
                {soldOut ? "Out of stock" : hasActivePromo ? "Add to cart at flash sale price" : "Add to cart"}
              </Button>
              <Button block size="xl" variant="dark" onClick={buyNow} disabled={soldOut}>
                {hasActivePromo ? "Checkout now" : "Buy now"}
              </Button>
              <div className="flex gap-2">
                <Button
                  block
                  size="md"
                  variant="outline"
                  onClick={() =>
                    toast(favorites.toggle(product.id) ? "Saved to your favorites" : "Removed from favorites", "info")
                  }
                  leadingIcon={
                    <Heart
                      className={cn("h-4 w-4", isFavorite && "text-deal")}
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                  }
                >
                  {isFavorite ? "Saved" : "Save"}
                </Button>
                <Button
                  block
                  size="md"
                  variant="outline"
                  leadingIcon={<Share2 className="h-4 w-4" />}
                  onClick={async () => {
                    const url = window.location.href;
                    if (navigator.share) {
                      await navigator.share({ title: product.name, url }).catch(() => undefined);
                    } else {
                      await navigator.clipboard?.writeText(url).catch(() => undefined);
                      toast("Link copied to clipboard", "info");
                    }
                  }}
                >
                  Share
                </Button>
              </div>
              {inCart > 0 && (
                <p className="text-center text-sm text-ink-3">
                  {inCart} already in your{" "}
                  <Link to="/cart" className="font-medium text-brand hover:underline">cart</Link>
                </p>
              )}
            </div>

            <div className="mt-3.5">
              <DeliveryEstimate product={product} />
            </div>

            <div className="mt-3">
              <TrustStrip />
            </div>

            {product.sellerId && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3">
                <Store className="h-4 w-4" />
                Sold by <span className="font-medium capitalize text-ink-2">
                  {product.sellerId.replace(/^seller_/, "").replace(/_/g, " ")}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="rounded-card bg-white px-3 py-1 md:px-4">
          {product.descriptionParagraphs.length > 0 && (
            <InfoBlock title="Description">
              <ul className="space-y-3">
                {product.descriptionParagraphs.map((paragraph, i) => {
                  const [heading, ...rest] = paragraph.split("\n");
                  const body = rest.join("\n").trim();
                  return (
                    <li key={i}>
                      {body ? (
                        <>
                          <p className="text-md font-semibold text-ink">{heading}</p>
                          <p className="mt-0.5 whitespace-pre-line text-md leading-relaxed text-ink-2">{body}</p>
                        </>
                      ) : (
                        <p className="text-md leading-relaxed text-ink-2">{heading}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </InfoBlock>
          )}

          {product.details && (
            <InfoBlock title="Product details" defaultOpen={!product.descriptionParagraphs.length}>
              <p className="whitespace-pre-line text-md leading-relaxed text-ink-2">{product.details}</p>
            </InfoBlock>
          )}

          {product.whatsInTheBox.length > 0 && (
            <InfoBlock title="What's in the box" defaultOpen={false}>
              <ul className="space-y-1.5">
                {product.whatsInTheBox.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-md text-ink-2">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </InfoBlock>
          )}

          <InfoBlock title="Specifications" defaultOpen={false}>
            <SpecTable product={product} />
          </InfoBlock>

          {product.descriptionImages.length > 0 && (
            <InfoBlock title="More about this item" defaultOpen={false}>
              <div className="space-y-2">
                {product.descriptionImages.map((image, i) => (
                  <SmartImage
                    key={`${image}-${i}`}
                    src={image}
                    alt={`${product.name} detail ${i + 1}`}
                    wrapperClassName="w-full rounded-card bg-surface-sunken aspect-[4/3]"
                    className="object-contain"
                  />
                ))}
              </div>
            </InfoBlock>
          )}
        </div>

        {/* Related rail beside the details on wide screens */}
        {related.length > 0 && (
          <aside className="rounded-card bg-white px-3 py-3.5 md:px-4">
            <SectionHeader title="You may also like" to={categoryPath(product.category)} />
            <div className="grid grid-cols-2 gap-2">
              {related.slice(0, 6).map((item) => (
                <Link key={item.id} to={`/product/${item.id}`} className="group">
                  <SmartImage
                    src={item.images[0]}
                    alt={item.name}
                    wrapperClassName="aspect-square w-full rounded-card bg-surface-sunken"
                  />
                  <PriceDisplay price={item.price} size="sm" showList={false} className="mt-1" />
                  <p className="clamp-2 text-xs text-ink-2 group-hover:text-brand">{item.name}</p>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>

      <div id="reviews" className="mt-3 scroll-mt-40">
        <ProductReviews product={product} />
      </div>

      {related.length > 0 && (
        <section className="mt-3 rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader title={`More in ${product.category}`} to={categoryPath(product.category)} />
          <ProductRail products={related} />
        </section>
      )}

      <section className="mt-3 rounded-card bg-white px-3 py-3.5 md:px-4">
        <SectionHeader title="Recommended for you" />
        <ProductRail products={recommended} />
      </section>

      {/* Sticky mobile action bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-2 border-t border-line bg-white px-3 py-2 md:hidden">
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
          onClick={() =>
            toast(favorites.toggle(product.id) ? "Saved to your favorites" : "Removed from favorites", "info")
          }
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line"
        >
          <Heart className={cn("h-5 w-5", isFavorite ? "text-deal" : "text-ink-2")} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <Button block size="lg" variant="secondary" onClick={addToCart} disabled={soldOut}>
          Add to cart
        </Button>
        <Button block size="lg" onClick={buyNow} disabled={soldOut}>
          {hasActivePromo ? "Checkout" : "Buy now"}
        </Button>
      </div>
      <div aria-hidden className="h-14 md:hidden" />

      {/* Flash sale modal */}
      {flashOffer && (
        <FlashSaleModal
          open={flashModalOpen}
          onClose={() => setFlashModalOpen(false)}
          productName={product.name}
          image={product.images[0]}
          promoPrice={flashOffer.price}
          originalPrice={product.price}
          expiresAt={flashSale.session?.expiresAt ?? Date.now() + 10 * 60 * 1000}
          onClaim={claimNow}
          loading={claiming}
        />
      )}

      {/* Navigation guard */}
      <Modal
        open={guardOpen}
        onClose={() => {
          setGuardOpen(false);
          blocker.reset?.();
        }}
        title="You'll lose your flash sale bonus"
      >
        <p className="text-md text-ink-2">
          Your limited-time discount will be lost if you leave this page.
        </p>
        <div className="mt-4 space-y-2">
          <Button block size="lg" onClick={guardCheckout}>
            Checkout now
          </Button>
          <Button block variant="outline" onClick={guardLeave}>
            Leave anyway
          </Button>
        </div>
      </Modal>
    </div>
  );
}
