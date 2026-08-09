import { cn } from "../../lib/utils";
import type { Product } from "../../types/product";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "../ui/Skeleton";

/**
 * Temu's responsive product grid: 2 columns on phones stepping up to 6 on wide
 * desktops, with the tight 8px gutters the reference site uses.
 */
export function ProductGrid({
  products,
  loading,
  skeletonCount = 12,
  className,
  /** Number of leading images to load eagerly (above the fold). */
  eagerCount = 6,
}: {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
  eagerCount?: number;
}) {
  if (loading) return <ProductGridSkeleton count={skeletonCount} className={className} />;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} eager={index < eagerCount} />
      ))}
    </div>
  );
}

/** Horizontally scrolling rail used for "Related" / "Recently viewed". */
export function ProductRail({ products, className }: { products: Product[]; className?: string }) {
  if (!products.length) return null;
  return (
    <div className={cn("no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0", className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="rail" />
      ))}
    </div>
  );
}
