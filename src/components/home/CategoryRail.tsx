import { useMemo } from "react";
import { Link } from "react-router-dom";
import { catalogueCategories } from "../../services/products";
import type { Product } from "../../types/product";
import { SmartImage } from "../ui/SmartImage";
import { Skeleton } from "../ui/Skeleton";
import { categoryPath } from "../layout/CategoryNav";

/**
 * The circular category shortcuts Temu puts directly under its header. Each
 * tile borrows the first image from a product in that category, so the rail is
 * entirely data-driven.
 */
export function CategoryRail({ products, loading }: { products: Product[]; loading?: boolean }) {
  const tiles = useMemo(() => {
    return catalogueCategories(products).map(({ name }) => ({
      name,
      image: products.find((p) => p.category === name && p.images[0])?.images[0],
    }));
  }, [products]);

  if (loading) {
    return (
      <div className="no-scrollbar flex gap-4 overflow-x-auto py-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!tiles.length) return null;

  return (
    <nav aria-label="Shop by category" className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 py-3 md:mx-0 md:justify-center md:gap-6 md:px-0">
      {tiles.map(({ name, image }) => (
        <Link
          key={name}
          to={categoryPath(name)}
          className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 md:w-[80px]"
        >
          <SmartImage
            src={image}
            alt=""
            wrapperClassName="h-14 w-14 rounded-full bg-surface-sunken ring-1 ring-line transition-all group-hover:ring-2 group-hover:ring-brand md:h-16 md:w-16"
          />
          <span className="w-full truncate text-center text-xs text-ink-2 group-hover:text-brand md:text-sm">
            {name}
          </span>
        </Link>
      ))}
    </nav>
  );
}
