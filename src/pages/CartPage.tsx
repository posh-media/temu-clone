import { ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartItem } from "../components/cart/CartItem";
import { CartSummary, FreeShippingProgress } from "../components/cart/CartSummary";
import { ProductRail } from "../components/product/ProductGrid";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useRecommended } from "../hooks/useCatalogue";
import { formatPrice } from "../lib/format";
import { useCart } from "../store/CartProvider";
import { useFavorites } from "../store/FavoritesProvider";
import { useToast } from "../store/ToastProvider";

export default function CartPage() {
  const { items, totals, setAllSelected, clearSelected, isHydrating } = useCart();
  const favorites = useFavorites();
  const recommended = useRecommended("cart-feed", 18);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const someSelected = items.some((i) => i.selected);

  if (isHydrating && items.length === 0) {
    return (
      <div className="shell space-y-3 py-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[300px] w-full rounded-card" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shell py-3">
        <div className="rounded-card bg-white">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse the catalogue and add something you love - free shipping over ₦30,000."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/">
                  <Button>Start shopping</Button>
                </Link>
                {favorites.products.length > 0 && (
                  <Link to="/favorites">
                    <Button variant="outline">View your favorites ({favorites.products.length})</Button>
                  </Link>
                )}
              </div>
            }
          />
        </div>

        {recommended.length > 0 && (
          <section className="mt-3 rounded-card bg-white px-3 py-3.5 md:px-4">
            <SectionHeader title="Popular right now" />
            <ProductRail products={recommended} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="shell py-3">
      <div className="flex items-baseline justify-between gap-3 pb-2.5">
        <h1 className="text-2xl font-bold">
          Shopping cart <span className="text-md font-normal text-ink-3">({totals.itemCount} items)</span>
        </h1>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <FreeShippingProgress totals={totals} />

          <div className="rounded-card bg-white px-3 py-2 md:px-4">
            {/* Bulk selection toolbar */}
            <div className="flex items-center justify-between gap-3 border-b border-line-2 py-2">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={(checked) => setAllSelected(checked)}
                label={<span className="font-medium">Select all ({items.length})</span>}
              />
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-deal disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Remove selected
              </button>
            </div>

            <ul>
              {items.map((line) => (
                <CartItem key={`${line.productId}-${line.variation ?? ""}`} line={line} />
              ))}
            </ul>
          </div>

          {favorites.products.length > 0 && (
            <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
              <SectionHeader title="Saved for later" subtitle="From your favorites" to="/favorites" />
              <ProductRail products={favorites.products.slice(0, 12)} />
            </section>
          )}
        </div>

        {/* Desktop summary aside */}
        <aside className="hidden lg:block">
          <div className="sticky top-[168px]">
            <CartSummary
              totals={totals}
              ctaLabel={`Checkout (${totals.selectedCount})`}
              ctaDisabled={!someSelected}
              onCta={() => navigate("/checkout")}
            />
          </div>
        </aside>
      </div>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <section className="mt-3 rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader title="You may also like" />
          <ProductRail products={recommended} />
        </section>
      )}

      {/* Mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-white px-3 py-2 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink-3">
              {totals.selectedCount} selected
              {totals.shipping === 0 ? " \u00B7 free shipping" : ` \u00B7 +${formatPrice(totals.shipping)} shipping`}
            </p>
            <p className="text-lg font-extrabold text-brand">{formatPrice(totals.total)}</p>
          </div>
          <Button size="lg" disabled={!someSelected} onClick={() => navigate("/checkout")}>
            Checkout ({totals.selectedCount})
          </Button>
        </div>
      </div>
      <div aria-hidden className="h-16 lg:hidden" />

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Remove selected items?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" block onClick={() => setConfirmClear(false)}>
              Keep them
            </Button>
            <Button
              variant="deal"
              block
              onClick={() => {
                clearSelected();
                setConfirmClear(false);
                toast("Selected items removed", "info");
              }}
            >
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-md text-ink-2">
          This will remove {totals.selectedCount} item{totals.selectedCount === 1 ? "" : "s"} from your cart. You can
          always add them again from the product page.
        </p>
      </Modal>
    </div>
  );
}
