import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} aria-hidden />;
}

/** Matches the real ProductCard footprint so grids don't jump on load. */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="shell grid gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4 md:grid-cols-[92px_minmax(0,1fr)]">
        <div className="hidden gap-2 md:flex md:flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-12 w-full rounded-pill" />
        <Skeleton className="h-12 w-full rounded-pill" />
      </div>
    </div>
  );
}
