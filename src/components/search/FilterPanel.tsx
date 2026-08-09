import { useEffect, useState } from "react";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { ProductFilters } from "../../types/product";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Field";
import { Rating } from "../ui/Rating";
import { categoryIcon } from "../layout/CategoryNav";

interface Facets {
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  priceRange: { min: number; max: number };
}

const PROMO_TAGS = ["flash-sale", "Limited Offer", "Best Seller", "Style Pick"];
const PROMO_LABELS: Record<string, string> = { "flash-sale": "Lightning deals" };
const RATING_STEPS = [4.5, 4, 3.5, 3];
const MAX_VISIBLE_BRANDS = 8;

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line-2 py-3.5 last:border-b-0">
      <h3 className="mb-2.5 text-md font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/**
 * The faceted filter panel. Rendered as a sticky sidebar on desktop and inside
 * a bottom sheet on mobile - the same component, driven entirely by URL state.
 */
export function FilterPanel({
  filters,
  facets,
  update,
  toggleBrand,
  clearFilters,
  activeFilterCount,
}: {
  filters: ProductFilters;
  facets: Facets;
  update: (patch: Record<string, string | number | string[] | undefined | null>) => void;
  toggleBrand: (brand: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}) {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [minInput, setMinInput] = useState(filters.minPrice?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(filters.maxPrice?.toString() ?? "");

  // Keep the local price inputs in step with external URL changes.
  useEffect(() => setMinInput(filters.minPrice?.toString() ?? ""), [filters.minPrice]);
  useEffect(() => setMaxInput(filters.maxPrice?.toString() ?? ""), [filters.maxPrice]);

  const visibleBrands = showAllBrands ? facets.brands : facets.brands.slice(0, MAX_VISIBLE_BRANDS);

  const applyPrice = () => {
    update({
      min: minInput.trim() === "" ? undefined : Number(minInput),
      max: maxInput.trim() === "" ? undefined : Number(maxInput),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-lg font-bold">Filters</h2>
        {activeFilterCount > 0 && (
          <button type="button" onClick={clearFilters} className="text-sm font-medium text-brand hover:underline">
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <FilterGroup title="Category">
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              onClick={() => update({ category: undefined })}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-md",
                !filters.category ? "bg-brand-50 font-semibold text-brand" : "text-ink-2 hover:bg-surface-muted",
              )}
            >
              All categories
            </button>
          </li>
          {facets.categories.map(({ name, count }) => {
            const Icon = categoryIcon(name);
            const active = filters.category === name;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => update({ category: active ? undefined : name })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-md",
                    active ? "bg-brand-50 font-semibold text-brand" : "text-ink-2 hover:bg-surface-muted",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="text-xs text-ink-4">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="filter-min">Minimum price</label>
          <input
            id="filter-min"
            type="number"
            min={0}
            inputMode="numeric"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            placeholder="Min"
            className="h-9 w-full min-w-0 rounded-lg border border-line px-2 text-md focus:border-brand focus:outline-none"
          />
          <span className="text-ink-4">&ndash;</span>
          <label className="sr-only" htmlFor="filter-max">Maximum price</label>
          <input
            id="filter-max"
            type="number"
            min={0}
            inputMode="numeric"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            placeholder="Max"
            className="h-9 w-full min-w-0 rounded-lg border border-line px-2 text-md focus:border-brand focus:outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-4">
          Catalogue range {formatPrice(facets.priceRange.min, { decimals: false })} &ndash;{" "}
          {formatPrice(facets.priceRange.max, { decimals: false })}
        </p>
      </FilterGroup>

      <FilterGroup title="Customer rating">
        <ul className="space-y-1">
          {RATING_STEPS.map((step) => {
            const active = filters.minRating === step;
            return (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => update({ rating: active ? undefined : step })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left",
                    active ? "bg-brand-50" : "hover:bg-surface-muted",
                  )}
                >
                  <Rating value={step} size="sm" />
                  <span className={cn("text-md", active ? "font-semibold text-brand" : "text-ink-2")}>
                    {step} &amp; up
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Promotions">
        <div className="flex flex-wrap gap-1.5">
          {PROMO_TAGS.map((tag) => {
            const active = filters.promotionalTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => update({ promo: active ? undefined : tag })}
                className={cn(
                  "rounded-pill border px-2.5 py-1 text-sm transition-colors",
                  active
                    ? "border-brand bg-brand-50 font-semibold text-brand"
                    : "border-line text-ink-2 hover:border-brand hover:text-brand",
                )}
              >
                {PROMO_LABELS[tag] ?? tag}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {facets.brands.length > 0 && (
        <FilterGroup title="Brand">
          <ul className="space-y-1.5">
            {visibleBrands.map(({ name, count }) => (
              <li key={name}>
                <Checkbox
                  checked={filters.brands?.includes(name) ?? false}
                  onChange={() => toggleBrand(name)}
                  label={
                    <span className="flex w-full items-center gap-1.5">
                      <span className="truncate">{name}</span>
                      <span className="text-xs text-ink-4">({count})</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
          {facets.brands.length > MAX_VISIBLE_BRANDS && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 px-2"
              onClick={() => setShowAllBrands((s) => !s)}
            >
              {showAllBrands ? "Show fewer brands" : `Show all ${facets.brands.length} brands`}
            </Button>
          )}
        </FilterGroup>
      )}
    </div>
  );
}
