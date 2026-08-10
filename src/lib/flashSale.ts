/**
 * Flash-sale promotional logic.
 *
 * A product is on flash sale when its `promotionalTags` array contains a value
 * starting with `flash-sale-`. The number suffix is the promotional price in
 * the same currency unit as `product.price` (NGN in this project).
 */

export const FLASH_SALE_TAG_PREFIX = "flash-sale-";

/** Fallback duration in seconds when the env variable is missing or invalid. */
export const DEFAULT_FLASH_SALE_DURATION_SECONDS = 10 * 60;

function readDurationSeconds(): number {
  const raw = import.meta.env.VITE_FLASH_SALE_DURATION_SECONDS;
  if (raw == null) return DEFAULT_FLASH_SALE_DURATION_SECONDS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FLASH_SALE_DURATION_SECONDS;
}

function readRestartOnTimeout(): boolean {
  const raw = import.meta.env.VITE_FLASH_SALE_RESTART_ON_TIMEOUT;
  return String(raw).toLowerCase() === "true";
}

/** Central flash-sale configuration. Moving it to Firestore/admin later only
 *  requires changing this factory, not the rest of the feature. */
export function getFlashSaleConfig() {
  return {
    durationSeconds: readDurationSeconds(),
    durationMs: readDurationSeconds() * 1000,
    restartOnTimeout: readRestartOnTimeout(),
  };
}

/** Convenience export for the duration in milliseconds. Kept as a function so
 *  it always resolves the latest env value during HMR. */
export function getFlashSaleDurationMs() {
  return getFlashSaleConfig().durationMs;
}

/** @deprecated Use `getFlashSaleDurationMs()` for new code. */
export const FLASH_SALE_DURATION_MS = DEFAULT_FLASH_SALE_DURATION_SECONDS * 1000;

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

export function computeFlashSaleExpiration(startedAt: number, durationMs = getFlashSaleDurationMs()): number {
  return startedAt + durationMs;
}

export function isFlashSaleExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}
