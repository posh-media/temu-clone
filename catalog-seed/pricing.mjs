import { createHash } from "node:crypto";

/**
 * Category-aware provisional pricing for the Nigerian storefront.
 *
 * The rules are intentionally configurable: adjust CATEGORY_RULES to change
 * target NGN ranges or markups without touching the transformation logic.
 */

/**
 * Target retail price ranges in NGN per store category.
 * These are provisional seed values and should be reviewed before production.
 */
export const CATEGORY_RULES = {
  Electronics: { min: 8000, max: 600000, markupPercent: 0 },
  Gadgets: { min: 5000, max: 250000, markupPercent: 0 },
  Speaker: { min: 45000, max: 220000, markupPercent: 0 },
  Fashion: { min: 3500, max: 90000, markupPercent: 0 },
  Women: { min: 3500, max: 85000, markupPercent: 0 },
  Men: { min: 3500, max: 85000, markupPercent: 0 },
  "Home & Kitchen": { min: 3000, max: 140000, markupPercent: 0 },
  Home: { min: 3000, max: 120000, markupPercent: 0 },
  Automotive: { min: 4000, max: 150000, markupPercent: 0 },
  Toys: { min: 2500, max: 60000, markupPercent: 0 },
  "Toys & Games": { min: 2500, max: 60000, markupPercent: 0 },
  "Jewelry & Accessories": { min: 3000, max: 100000, markupPercent: 0 },
  Beauty: { min: 2500, max: 70000, markupPercent: 0 },
  Shoes: { min: 4500, max: 80000, markupPercent: 0 },
  Bags: { min: 3500, max: 90000, markupPercent: 0 },
  "Sports & Outdoors": { min: 4000, max: 130000, markupPercent: 0 },
  "Phone & Accessories": { min: 2500, max: 180000, markupPercent: 0 },
  "Computer Accessories": { min: 3500, max: 200000, markupPercent: 0 },
  Tools: { min: 3000, max: 120000, markupPercent: 0 },
  "Home Improvement": { min: 4000, max: 180000, markupPercent: 0 },
  "Office & School": { min: 2000, max: 90000, markupPercent: 0 },
  "Pet Supplies": { min: 2500, max: 70000, markupPercent: 0 },
  "Kids & Baby": { min: 2500, max: 70000, markupPercent: 0 },
};

const DEFAULT_RULE = { min: 3000, max: 80000, markupPercent: 0 };

/**
 * Map a source/category reference price into a realistic NGN retail price.
 *
 * @param {object} opts
 * @param {string} opts.category           store category
 * @param {number} [opts.referencePrice]   source/reference price (already in NGN for existing products; USD for new sources)
 * @param {string} [opts.currency]         'NGN' | 'USD'
 * @param {number} [opts.usdToNgn]         used when currency is 'USD'
 */
export function transformPrice({
  category,
  referencePrice = 0,
  currency = "NGN",
  usdToNgn = 1500,
} = {}) {
  const rule = CATEGORY_RULES[category] ?? DEFAULT_RULE;

  let ngn = referencePrice;
  if (currency === "USD") {
    ngn = referencePrice * usdToNgn * (1 + rule.markupPercent / 100);
  }

  // If the reference price is already in NGN, scale it into the category's
  // realistic target range while preserving the product's relative position.
  if (currency === "NGN") {
    const categoryRange = resolveCategoryRange(category, referencePrice);
    const normalized = normalize(referencePrice, categoryRange.min, categoryRange.max);
    ngn = lerp(normalized, rule.min, rule.max);
  }

  return roundTo10(clamp(ngn, rule.min, rule.max));
}

function normalize(value, min, max) {
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function lerp(t, min, max) {
  return min + t * (max - min);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function roundTo10(n) {
  return Math.round(n / 10) * 10;
}

/**
 * When re-pricing existing products, use the observed category price spread as
 * the reference range so relative value is preserved.
 */
export function resolveCategoryRange(category, referencePrice) {
  const rule = CATEGORY_RULES[category] ?? DEFAULT_RULE;
  // Use a modest band around the reference price so outliers don't distort the
  // mapping excessively.  The band is widened when the reference is high.
  const center = Math.max(1, referencePrice);
  const halfBand = center * 2;
  return {
    min: Math.max(1, center - halfBand),
    max: Math.max(rule.max, center + halfBand),
  };
}

function hashFloat(seed) {
  const hex = createHash("sha256").update(String(seed)).digest("hex");
  return Number.parseInt(hex.slice(0, 12), 16) / 0xffffffffffff;
}

/**
 * Generate a deterministic provisional NGN price for a new product when no
 * reliable source price is available.  The price lands inside the category's
 * configured range so inexpensive accessories stay cheap and premium items stay
 * expensive.
 */
export function newProductPrice(category, seed) {
  const rule = CATEGORY_RULES[category] ?? DEFAULT_RULE;
  const t = hashFloat(seed);
  return roundTo10(lerp(t, rule.min, rule.max));
}

/**
 * Convenience helper for source USD prices.
 */
export function usdToNgnPrice(category, usdPrice, usdToNgn = 1500) {
  return transformPrice({ category, referencePrice: usdPrice, currency: "USD", usdToNgn });
}
