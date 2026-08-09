import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ProductFilters, SortOption } from "../types/product";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "best-selling", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "top-rated", label: "Top rated" },
  { value: "discount", label: "Biggest discount" },
  { value: "newest", label: "Newest arrivals" },
];

export { SORT_OPTIONS };

const isSort = (value: string | null): value is SortOption =>
  SORT_OPTIONS.some((o) => o.value === value);

const num = (value: string | null) => {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Search state lives in the URL rather than component state, so results are
 * shareable, bookmarkable and work with the browser back button.
 */
export function useSearchFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<ProductFilters>(
    () => ({
      query: params.get("q") ?? undefined,
      category: params.get("category") ?? undefined,
      brands: params.getAll("brand").filter(Boolean),
      minPrice: num(params.get("min")),
      maxPrice: num(params.get("max")),
      minRating: num(params.get("rating")),
      promotionalTag: params.get("promo") ?? undefined,
      sort: isSort(params.get("sort")) ? (params.get("sort") as SortOption) : "relevance",
    }),
    [params],
  );

  /** Patch one or more params; `undefined`/`null` removes a param. */
  const update = useCallback(
    (patch: Record<string, string | number | string[] | undefined | null>) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        next.delete(key);
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
        else next.set(key, String(value));
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const toggleBrand = useCallback(
    (brand: string) => {
      const current = params.getAll("brand");
      update({ brand: current.includes(brand) ? current.filter((b) => b !== brand) : [...current, brand] });
    },
    [params, update],
  );

  /** Clears facets but keeps the search term and sort order. */
  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    const q = params.get("q");
    const sort = params.get("sort");
    if (q) next.set("q", q);
    if (sort) next.set("sort", sort);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.brands?.length ?? 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.minRating !== undefined ? 1 : 0) +
    (filters.promotionalTag ? 1 : 0);

  return { filters, update, toggleBrand, clearFilters, activeFilterCount };
}
