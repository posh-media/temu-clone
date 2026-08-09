/**
 * Flash-sale promotional logic.
 *
 * A product is on flash sale when its `promotionalTags` array contains a value
 * starting with `flash-sale-`. The number suffix is the promotional price in
 * the same currency unit as `product.price` (NGN in this project).
 */

export const FLASH_SALE_TAG_PREFIX = "flash-sale-";

/** Default flash-sale window: 10 minutes. Configurable from a single constant. */
export const FLASH_SALE_DURATION_MS = 10 * 60 * 1000;

export interface FlashSaleOffer {
  tag: string;
  price: number;
  originalPrice: number;
}

/**
 * Finds the first valid `flash-sale-NUMBER` tag and extracts the price.
 * Returns `null` when no valid tag exists.
 */
export function parseFlashSalePrice(promotionalTags: string[], originalPrice: number): FlashSaleOffer | null {
  for (const tag of promotionalTags) {
    if (!tag.startsWith(FLASH_SALE_TAG_PREFIX)) continue;
    const suffix = tag.slice(FLASH_SALE_TAG_PREFIX.length).trim().replace(/,/g, "");
    const numeric = Number(suffix);
    if (Number.isFinite(numeric) && numeric > 0) {
      return { tag, price: Math.round(numeric), originalPrice };
    }
  }
  return null;
}

/**
 * When multiple `flash-sale-NUMBER` tags are present, we use the **lowest**
 * valid price. This is deterministic and gives the customer the best deal.
 */
export function parseFlashSalePriceBest(promotionalTags: string[], originalPrice: number): FlashSaleOffer | null {
  const offers: FlashSaleOffer[] = [];
  for (const tag of promotionalTags) {
    if (!tag.startsWith(FLASH_SALE_TAG_PREFIX)) continue;
    const suffix = tag.slice(FLASH_SALE_TAG_PREFIX.length).trim().replace(/,/g, "");
    const numeric = Number(suffix);
    if (Number.isFinite(numeric) && numeric > 0) {
      offers.push({ tag, price: Math.round(numeric), originalPrice });
    }
  }
  if (!offers.length) return null;
  return offers.sort((a, b) => a.price - b.price)[0];
}

export function computeFlashSaleExpiration(startedAt: number, durationMs = FLASH_SALE_DURATION_MS): number {
  return startedAt + durationMs;
}

export function isFlashSaleExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}
