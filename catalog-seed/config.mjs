/**
 * Catalog seed configuration.
 *
 * This file centralizes the source, category mapping, quality rules, pricing
 * transformation, and ID generation used by the seed pipeline.
 *
 * NOTE: The experiment originally targeted Temu product pages, but Temu
 * requires login / blocks headless access.  The pipeline is source-agnostic;
 * the sample below uses DummyJSON (a public product API) only to validate the
 * pipeline and produce an initial staging dataset.  Substitute another permitted
 * source by updating SOURCE and CATEGORY_MAP.
 */

/** Fallback source for the controlled sample. */
export const SOURCE = {
  name: "dummyjson",
  baseUrl: "https://dummyjson.com",
  displayName: "DummyJSON Public API",
};

/** Temu target (kept for documentation; not used because access is blocked). */
export const TEMU_SOURCE = {
  name: "temu",
  baseUrl: "https://www.temu.com",
  displayName: "Temu Public Product Pages",
};

/** Source categories that are never imported. */
export const EXCLUDED_CATEGORIES = ["groceries"];

/** Products whose name/category/tags match these are rejected. */
export const REJECTED_KEYWORDS = [
  "food", "drink", "water", "fruit", "kiwi", "grocery", "groceries", "snack",
  "beverage", "milk", "coffee", "tea", "juice", "soda", "wine", "beer", "rice",
  "pasta", "cereal", "candy", "meat", "beef", "chicken", "fish", "honey",
  "sauce", "vinegar", "yogurt", "biscuit",
];

/**
 * Map source category slugs to the store's public categories and sub-categories.
 */
export const CATEGORY_MAP = {
  beauty: { category: "Beauty", subCategory: "Beauty" },
  fragrances: { category: "Beauty", subCategory: "Fragrances" },
  furniture: { category: "Home & Kitchen", subCategory: "Furniture" },
  "home-decoration": { category: "Home & Kitchen", subCategory: "Home Decor" },
  "kitchen-accessories": { category: "Home & Kitchen", subCategory: "Kitchen Accessories" },
  laptops: { category: "Electronics", subCategory: "Laptops" },
  "mens-shirts": { category: "Fashion", subCategory: "Men's Shirts" },
  "mens-shoes": { category: "Shoes", subCategory: "Men's Shoes" },
  "mens-watches": { category: "Jewelry & Accessories", subCategory: "Men's Watches" },
  "mobile-accessories": { category: "Electronics", subCategory: "Phone & Accessories" },
  motorcycle: { category: "Automotive", subCategory: "Motorcycle" },
  "skin-care": { category: "Beauty", subCategory: "Skin Care" },
  smartphones: { category: "Electronics", subCategory: "Smartphones" },
  "sports-accessories": { category: "Sports & Outdoors", subCategory: "Sports Accessories" },
  sunglasses: { category: "Fashion", subCategory: "Sunglasses" },
  tablets: { category: "Electronics", subCategory: "Tablets" },
  tops: { category: "Fashion", subCategory: "Women's Tops" },
  vehicle: { category: "Automotive", subCategory: "Vehicle" },
  "womens-bags": { category: "Bags", subCategory: "Women's Bags" },
  "womens-dresses": { category: "Fashion", subCategory: "Women's Dresses" },
  "womens-jewellery": { category: "Jewelry & Accessories", subCategory: "Women's Jewelry" },
  "womens-shoes": { category: "Shoes", subCategory: "Women's Shoes" },
  "womens-watches": { category: "Jewelry & Accessories", subCategory: "Women's Watches" },
};

export const STORE_CATEGORIES = [
  ...new Set(Object.values(CATEGORY_MAP).map((m) => m.category)),
].sort();

/** Fields that must be present and valid for a product to be accepted. */
export const REQUIRED_FIELDS = ["productName", "category", "price", "images"];

/** Pricing transformation (source USD -> NGN + optional markup). */
export const DEFAULT_USD_TO_NGN = Number(process.env.SEED_USD_TO_NGN ?? 1500);
export const DEFAULT_MARKUP_PERCENT = Number(process.env.SEED_PRICE_MARKUP_PERCENT ?? 30);

/** Low-stock threshold used by the UI urgency label. */
export const LOW_STOCK_THRESHOLD = 60;
