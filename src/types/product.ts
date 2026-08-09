/**
 * Domain types for the `products` collection.
 *
 * `ProductDocument` mirrors the *raw* Firestore shape (everything optional,
 * because the 197 existing documents are not uniform). `Product` is the
 * normalised shape the UI consumes - see `src/services/mappers.ts`.
 */

export interface ProductReviewDocument {
  customerName?: string;
  title?: string;
  comment?: string;
  rating?: number;
  verifiedPurchase?: boolean;
  created_at?: unknown;
}

export interface ProductDocument {
  productId?: string;
  productName?: string;
  brandName?: string;
  category?: string;
  subCategory?: string;
  productType?: string;
  material?: string;
  productDetails?: string;
  description?: string[];
  whatsInTheBox?: string[];
  tags?: string[];
  promotionalTags?: string[];
  images?: string[];
  descriptionImgs?: string[];
  price?: number;
  discountPercent?: number;
  ratings?: number;
  soldQuantity?: number;
  totalStock?: number;
  availableStock?: number;
  sponsored?: boolean;
  harmful?: boolean;
  display?: boolean;
  reviews?: ProductReviewDocument;
  productReviewsList?: ProductReviewDocument[];
  sellerRef?: unknown;
  created_time?: unknown;
}

export interface ProductReview {
  id: string;
  customerName: string;
  title?: string;
  comment: string;
  rating: number;
  verifiedPurchase: boolean;
  createdAt?: Date;
}

export interface Product {
  /** Firestore document id - used in URLs and as the cart key. */
  id: string;
  name: string;
  brand?: string;
  category: string;
  subCategory?: string;
  productType?: string;
  material?: string;
  /** Long-form copy shown in the "Details" block. */
  details?: string;
  /** Bullet paragraphs shown in the description accordion. */
  descriptionParagraphs: string[];
  whatsInTheBox: string[];
  tags: string[];
  promotionalTags: string[];
  images: string[];
  descriptionImages: string[];
  /** Current selling price. */
  price: number;
  /** Pre-discount price, derived from `price` + `discountPercent`. */
  listPrice?: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  soldQuantity: number;
  availableStock: number;
  totalStock: number;
  sponsored: boolean;
  reviews: ProductReview[];
  sellerId?: string;
  createdAt?: Date;
  /** True when stock is low enough to show Temu's urgency label. */
  lowStock: boolean;
}

export type SortOption =
  | "relevance"
  | "best-selling"
  | "price-asc"
  | "price-desc"
  | "top-rated"
  | "newest"
  | "discount";

export interface ProductFilters {
  query?: string;
  category?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  promotionalTag?: string;
  freeShippingOnly?: boolean;
  sort?: SortOption;
}

export interface CategoryNode {
  id: string;
  name: string;
  subCategories: { name: string; tags: string[]; image?: string; hot?: boolean }[];
}
