import { ChevronDown, Loader2, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FilterPanel } from "../components/search/FilterPanel";
import { ProductGrid } from "../components/product/ProductGrid";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Drawer } from "../components/ui/Modal";
import { useCatalogueFacets, useFilteredProducts } from "../hooks/useCatalogue";
import { useInfiniteList } from "../hooks/useInfiniteList";
import { SORT_OPTIONS, useSearchFilters } from "../hooks/useSearchFilters";
import { cn } from "../lib/utils";

/** Sort control: a native select on mobile, a popover list on desktop. */
function SortControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-pill border border-line bg-white px-3 text-md font-medium text-ink hover:border-ink/40"
      >
        <span className="text-ink-3">Sort:</span>
        <span className="max-w-[130px] truncate">{current.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-40 w-52 animate-slide-down overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop"
        >
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-md",
                  option.value === value ? "bg-brand-50 font-semibold text-brand" : "text-ink hover:bg-surface-muted",
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Removable chips summarising the active facets, as on Temu's results header. */
function ActiveFilterChips({
  filters,
  update,
  toggleBrand,
}: {
  filters: ReturnType<typeof useSearchFilters>["filters"];
  update: ReturnType<typeof useSearchFilters>["update"];
  toggleBrand: (brand: string) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.category) chips.push({ label: filters.category, onRemove: () => update({ category: undefined }) });
  if (filters.promotionalTag)
    chips.push({ label: filters.promotionalTag, onRemove: () => update({ promo: undefined }) });
  if (filters.minRating !== undefined)
    chips.push({ label: `${filters.minRating}★ & up`, onRemove: () => update({ rating: undefined }) });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push({
      label: `${filters.minPrice ?? 0} – ${filters.maxPrice ?? "∞"}`,
      onRemove: () => update({ min: undefined, max: undefined }),
    });
  }
  filters.brands?.forEach((brand) => chips.push({ label: brand, onRemove: () => toggleBrand(brand) }));

  if (!chips.length) return null;

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {chips.map(({ label, onRemove }) => (
        <li key={label}>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 rounded-pill bg-brand-50 px-2.5 py-1 text-sm font-medium text-brand hover:bg-brand-100"
          >
            {label}
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const { filters, update, toggleBrand, clearFilters, activeFilterCount } = useSearchFilters();
  const facets = useCatalogueFacets();
  const { products, isLoading } = useFilteredProducts(filters);
  const { visible, hasMore, loadMore, sentinelRef } = useInfiniteList(products, 30);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = filters.query?.trim();
  const heading = query
    ? `Results for "${query}"`
    : filters.category
      ? filters.category
      : filters.promotionalTag
        ? filters.promotionalTag
        : "All products";

  // Close the mobile sheet whenever the result set changes.
  useEffect(() => setFiltersOpen(false), [params]);

  const panel = (
    <FilterPanel
      filters={filters}
      facets={facets}
      update={update}
      toggleBrand={toggleBrand}
      clearFilters={clearFilters}
      activeFilterCount={activeFilterCount}
    />
  );

  return (
    <div className="shell py-3">
      <div className="flex gap-4">
        {/* Desktop sidebar */}
        <aside className="hidden w-[212px] shrink-0 lg:block">
          <div className="sticky top-[168px] max-h-[calc(100dvh-190px)] overflow-y-auto rounded-card bg-white px-3 py-2">
            {panel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="rounded-card bg-white px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold md:text-2xl">{heading}</h1>
                <p className="mt-0.5 text-sm text-ink-3">
                  {isLoading ? "Searching the catalogue…" : `${products.length} item${products.length === 1 ? "" : "s"} found`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                  leadingIcon={<SlidersHorizontal className="h-4 w-4" />}
                >
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
                <SortControl value={filters.sort ?? "relevance"} onChange={(sort) => update({ sort })} />
              </div>
            </div>

            <div className="mt-2.5">
              <ActiveFilterChips filters={filters} update={update} toggleBrand={toggleBrand} />
            </div>
          </div>

          <div className="mt-3">
            {!isLoading && products.length === 0 ? (
              <div className="rounded-card bg-white">
                <EmptyState
                  icon={PackageSearch}
                  title={query ? `No results for "${query}"` : "No products match these filters"}
                  description="Try a different spelling, fewer filters, or browse a category instead."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {activeFilterCount > 0 && (
                        <Button variant="outline" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                      <Link to="/search">
                        <Button>Browse all products</Button>
                      </Link>
                    </div>
                  }
                />
              </div>
            ) : (
              <>
                <ProductGrid products={visible} loading={isLoading} skeletonCount={18} eagerCount={6} />
                <div ref={sentinelRef} className="h-1" aria-hidden />
                {hasMore && (
                  <div className="flex justify-center pt-5">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      leadingIcon={<Loader2 className="h-4 w-4 animate-spin" />}
                    >
                      Loading more
                    </Button>
                  </div>
                )}
                {!hasMore && !isLoading && visible.length > 0 && (
                  <p className="pt-6 text-center text-sm text-ink-4">End of results</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="bottom"
        title="Filters"
        className="lg:hidden"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" block onClick={clearFilters}>
              Clear all
            </Button>
            <Button block onClick={() => setFiltersOpen(false)}>
              Show {products.length} result{products.length === 1 ? "" : "s"}
            </Button>
          </div>
        }
      >
        {panel}
      </Drawer>
    </div>
  );
}
