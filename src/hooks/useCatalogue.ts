import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  cataloguePriceRange, catalogueBrands, catalogueCategories, fetchCatalogue, fetchCategories,
  fetchProductById, filterCatalogue, relatedProducts, shuffleStable,
} from "../services/products";
import type { Product, ProductFilters } from "../types/product";

/** Cache keys live in one object so they can never drift between hooks. */
export const queryKeys = {
  catalogue: ["catalogue"] as const,
  categories: ["categories"] as const,
  product: (id: string) => ["product", id] as const,
  orders: (scope: string) => ["orders", scope] as const,
  order: (id: string) => ["order", id] as const,
  addresses: (scope: string) => ["addresses", scope] as const,
};

/**
 * The whole visible catalogue, fetched once and cached for 5 minutes. Every
 * listing surface (home rails, search, related products) derives from this, so
 * navigating around the app performs no extra Firestore reads.
 */
export function useCatalogue() {
  return useQuery({
    queryKey: queryKeys.catalogue,
    queryFn: fetchCatalogue,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * A single product. Reads from the cached catalogue when available so an
 * in-app click straight to the PDP renders instantly, while still fetching the
 * document directly (deep links / hard refresh).
 */
export function useProduct(id: string | undefined) {
  const { data: catalogue } = useCatalogue();
  const cached = useMemo(() => catalogue?.find((p) => p.id === id), [catalogue, id]);

  const queryResult = useQuery({
    queryKey: queryKeys.product(id ?? ""),
    queryFn: () => fetchProductById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    initialData: cached,
  });

  return queryResult;
}

/** Derived catalogue facets for the search sidebar. */
export function useCatalogueFacets() {
  const { data: catalogue = [] } = useCatalogue();
  return useMemo(
    () => ({
      categories: catalogueCategories(catalogue),
      brands: catalogueBrands(catalogue),
      priceRange: cataloguePriceRange(catalogue),
    }),
    [catalogue],
  );
}

export function useFilteredProducts(filters: ProductFilters) {
  const { data: catalogue = [], isLoading, isError } = useCatalogue();
  const products = useMemo(() => filterCatalogue(catalogue, filters), [catalogue, filters]);
  return { products, isLoading, isError };
}

export function useRelatedProducts(product: Product | undefined | null, count = 12) {
  const { data: catalogue = [] } = useCatalogue();
  return useMemo(
    () => (product ? relatedProducts(catalogue, product, count) : []),
    [catalogue, product, count],
  );
}

/** Deterministically shuffled slice, used for the endless recommendation feed. */
export function useRecommended(seed: string, count: number) {
  const { data: catalogue = [] } = useCatalogue();
  return useMemo(() => shuffleStable(catalogue, seed).slice(0, count), [catalogue, seed, count]);
}
