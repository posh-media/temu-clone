import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";
import { seededRandom, uniqueBy } from "../lib/utils";
import type { CategoryNode, Product, ProductFilters, SortOption } from "../types/product";
import { mapCategory, mapProduct } from "./mappers";

/**
 * The catalogue is small (~200 docs) and Firestore has no full-text search, so
 * we fetch the visible catalogue once and do searching / filtering / sorting in
 * memory. React Query caches the result, so this is a single network round trip
 * per session rather than a query per keystroke.
 */
export async function fetchCatalogue(): Promise<Product[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.products));
  // `display` and `visible` are missing on legacy documents, and a Firestore `!=`
  // filter would silently drop those, so the visibility check happens client side.
  return snap.docs
    .filter((d) => d.get("display") !== false && d.get("visible") !== false)
    .map(mapProduct)
    .filter((p) => p.price > 0);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.products, id));
  if (!snap.exists()) return null;
  return mapProduct(snap);
}

export async function fetchCategories(): Promise<CategoryNode[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.categories), limit(50)));
  return snap.docs.map(mapCategory);
}

/* ------------------------------------------------------------------ */
/* In-memory catalogue queries                                         */
/* ------------------------------------------------------------------ */

function searchTokens(input: string) {
  return input.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 1);
}

/** Weighted relevance score; 0 means "no match". */
export function scoreProduct(product: Product, tokens: string[]) {
  if (!tokens.length) return 1;
  const haystacks: [string, number][] = [
    [product.name.toLowerCase(), 6],
    [product.brand?.toLowerCase() ?? "", 4],
    [product.tags.join(" ").toLowerCase(), 3],
    [product.category.toLowerCase(), 2],
    [product.subCategory?.toLowerCase() ?? "", 2],
    [product.productType?.toLowerCase() ?? "", 1],
    [product.details?.toLowerCase() ?? "", 1],
  ];

  let score = 0;
  for (const token of tokens) {
    let hit = 0;
    for (const [text, weight] of haystacks) {
      if (!text) continue;
      if (text.startsWith(token)) hit = Math.max(hit, weight * 1.5);
      else if (text.includes(token)) hit = Math.max(hit, weight);
    }
    if (hit === 0) return 0; // every token must match somewhere
    score += hit;
  }
  return score;
}

const SORTERS: Record<SortOption, (a: Product, b: Product) => number> = {
  relevance: () => 0,
  "best-selling": (a, b) => b.soldQuantity - a.soldQuantity,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "top-rated": (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  newest: (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  discount: (a, b) => b.discountPercent - a.discountPercent,
};

export function filterCatalogue(catalogue: Product[], filters: ProductFilters): Product[] {
  const tokens = searchTokens(filters.query ?? "");
  const scored: { product: Product; score: number }[] = [];

  for (const product of catalogue) {
    if (filters.category && filters.category !== "All" && product.category !== filters.category) continue;
    if (filters.brands?.length && !filters.brands.includes(product.brand ?? "")) continue;
    if (filters.minPrice !== undefined && product.price < filters.minPrice) continue;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) continue;
    if (filters.minRating !== undefined && product.rating < filters.minRating) continue;
    if (filters.promotionalTag && !product.promotionalTags.includes(filters.promotionalTag)) continue;

    const score = scoreProduct(product, tokens);
    if (score === 0) continue;
    scored.push({ product, score });
  }

  const sort = filters.sort ?? "relevance";
  if (sort === "relevance") {
    // Relevance = text score, then sponsored placement, then popularity.
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.product.sponsored) - Number(a.product.sponsored) ||
        b.product.soldQuantity - a.product.soldQuantity,
    );
  } else {
    scored.sort((a, b) => SORTERS[sort](a.product, b.product));
  }
  return scored.map((s) => s.product);
}

/** Distinct categories present in the catalogue, ordered by product count. */
export function catalogueCategories(catalogue: Product[]) {
  const counts = new Map<string, number>();
  for (const p of catalogue) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function catalogueBrands(catalogue: Product[]) {
  const counts = new Map<string, number>();
  for (const p of catalogue) if (p.brand) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

export function cataloguePriceRange(catalogue: Product[]) {
  if (!catalogue.length) return { min: 0, max: 0 };
  const prices = catalogue.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Related products: same category first, then same brand, then popular filler -
 * so the "You may also like" rail is never empty for sparse categories.
 */
export function relatedProducts(catalogue: Product[], product: Product, count = 12): Product[] {
  const pool = catalogue.filter((p) => p.id !== product.id);
  const sameCategory = pool.filter((p) => p.category === product.category);
  const sameBrand = pool.filter((p) => p.brand && p.brand === product.brand);
  const sharedTag = pool.filter((p) => p.tags.some((t) => product.tags.includes(t)));
  const popular = [...pool].sort((a, b) => b.soldQuantity - a.soldQuantity);
  return uniqueBy([...sameCategory, ...sameBrand, ...sharedTag, ...popular], (p) => p.id).slice(0, count);
}

/** Stable "random" ordering so recommendation rails differ but don't reshuffle. */
export function shuffleStable(products: Product[], seed: string) {
  return [...products].sort((a, b) => seededRandom(seed + a.id) - seededRandom(seed + b.id));
}
