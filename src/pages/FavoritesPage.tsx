import { HeartOff } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductGrid, ProductRail } from "../components/product/ProductGrid";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useCatalogue, useRecommended } from "../hooks/useCatalogue";
import { useCart } from "../store/CartProvider";
import { useFavorites } from "../store/FavoritesProvider";
import { useToast } from "../store/ToastProvider";

export default function FavoritesPage() {
  const favorites = useFavorites();
  const { isLoading } = useCatalogue();
  const { add } = useCart();
  const { toast } = useToast();
  const recommended = useRecommended("favorites-feed", 18);

  const addAll = () => {
    favorites.products.forEach((product) => {
      if (product.availableStock > 0) add(product, 1);
    });
    toast(`${favorites.products.length} item(s) added to cart`);
  };

  return (
    <div className="shell py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h1 className="text-2xl font-bold">Your favorites</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {favorites.products.length} saved item{favorites.products.length === 1 ? "" : "s"} on this device
          </p>
        </div>
        {favorites.products.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => favorites.clear()}>
              Clear all
            </Button>
            <Button onClick={addAll}>Add all to cart</Button>
          </div>
        )}
      </div>

      {!isLoading && favorites.products.length === 0 ? (
        <div className="rounded-card bg-white">
          <EmptyState
            icon={HeartOff}
            title="No favorites yet"
            description="Tap the heart on any product to keep it here for later."
            action={
              <Link to="/">
                <Button>Find something you love</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ProductGrid products={favorites.products} loading={isLoading} skeletonCount={12} />
      )}

      {recommended.length > 0 && (
        <section className="mt-3 rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader title="You may also like" />
          <ProductRail products={recommended} />
        </section>
      )}
    </div>
  );
}
