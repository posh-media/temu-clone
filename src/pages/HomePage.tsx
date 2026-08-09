import { Crown, Loader2, PackageSearch, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useCatalogue, useRecommended } from "../hooks/useCatalogue";
import { useInfiniteList } from "../hooks/useInfiniteList";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { CategoryRail } from "../components/home/CategoryRail";
import { FlashDeals } from "../components/home/FlashDeals";
import { HeroCarousel } from "../components/home/HeroCarousel";
import { PromoCards } from "../components/home/PromoCards";
import { ProductGrid, ProductRail } from "../components/product/ProductGrid";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ProductGridSkeleton, Skeleton } from "../components/ui/Skeleton";
import { categoryPath } from "../components/layout/CategoryNav";
import { catalogueCategories } from "../services/products";

/** Categories large enough to deserve their own rail on the homepage. */
const MIN_PRODUCTS_PER_RAIL = 6;
const MAX_CATEGORY_RAILS = 3;

export default function HomePage() {
  const { data: catalogue = [], isLoading, isError, refetch, isFetching } = useCatalogue();
  const [recentlyViewedIds] = useLocalStorage<string[]>("temu-clone:recently-viewed", []);

  const flashDeals = useMemo(
    () =>
      catalogue
        .filter((p) => p.promotionalTags.some((t) => t === "flash-sale" || t === "Limited Offer"))
        .sort((a, b) => b.discountPercent - a.discountPercent)
        .slice(0, 20),
    [catalogue],
  );

  const bestSellers = useMemo(
    () => [...catalogue].sort((a, b) => b.soldQuantity - a.soldQuantity).slice(0, 20),
    [catalogue],
  );

  const categoryRails = useMemo(() => {
    return catalogueCategories(catalogue)
      .filter(({ count }) => count >= MIN_PRODUCTS_PER_RAIL)
      .slice(0, MAX_CATEGORY_RAILS)
      .map(({ name }) => ({
        name,
        products: catalogue
          .filter((p) => p.category === name)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 20),
      }));
  }, [catalogue]);

  const recentlyViewed = useMemo(
    () => recentlyViewedIds.map((id) => catalogue.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [recentlyViewedIds, catalogue],
  );

  // Endless "More to love" feed, seeded so the order is stable across renders.
  const recommended = useRecommended("home-feed", catalogue.length);
  const { visible, hasMore, loadMore, sentinelRef } = useInfiniteList(recommended, 24);

  if (isError) {
    return (
      <div className="shell">
        <EmptyState
          icon={PackageSearch}
          title="We couldn't load the catalogue"
          description="The Firestore request failed. Check your connection and try again."
          action={<Button onClick={() => void refetch()} loading={isFetching}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="shell space-y-3 py-3">
      <CategoryRail products={catalogue} loading={isLoading} />

      {isLoading ? (
        <Skeleton className="h-[200px] w-full rounded-card md:h-[240px]" />
      ) : (
        <HeroCarousel products={catalogue} />
      )}

      {isLoading ? (
        <Skeleton className="h-[260px] w-full rounded-card" />
      ) : (
        <FlashDeals products={flashDeals} />
      )}

      {!isLoading && <PromoCards products={catalogue} />}

      {!isLoading && bestSellers.length > 0 && (
        <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader
            title={
              <>
                <Crown className="h-5 w-5 text-brand" fill="currentColor" />
                Best sellers
              </>
            }
            subtitle="The most-bought items in the store"
            to="/search?sort=best-selling"
          />
          <ProductRail products={bestSellers} />
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader title="Recently viewed" subtitle="Pick up where you left off" />
          <ProductRail products={recentlyViewed} />
        </section>
      )}

      {categoryRails.map(({ name, products }) => (
        <section key={name} className="rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader title={name} subtitle={`Top rated in ${name}`} to={categoryPath(name)} />
          <ProductRail products={products} />
        </section>
      ))}

      <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
        <SectionHeader
          title={
            <>
              <Sparkles className="h-5 w-5 text-brand" />
              More to love
            </>
          }
          subtitle="Recommended for you"
        />

        {isLoading ? (
          <ProductGridSkeleton count={18} />
        ) : (
          <>
            <ProductGrid products={visible} eagerCount={0} />
            <div ref={sentinelRef} className="h-1" aria-hidden />
            {hasMore && (
              <div className="flex justify-center pt-5">
                <Button variant="outline" onClick={loadMore} leadingIcon={<Loader2 className="h-4 w-4 animate-spin" />}>
                  Loading more
                </Button>
              </div>
            )}
            {!hasMore && visible.length > 0 && (
              <p className="pt-6 text-center text-sm text-ink-4">
                You&apos;ve seen all {recommended.length} products in the catalogue
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
