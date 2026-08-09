import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import { toDate } from "../lib/format";
import { isNonEmptyArray } from "../lib/utils";
import type {
  CategoryNode,
  Product,
  ProductDocument,
  ProductReview,
  ProductReviewDocument,
} from "../types/product";
import type { Order, OrderItem } from "../types/commerce";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f2f2f2"/><text x="50%" y="50%" font-family="Helvetica" font-size="20" fill="#b4b4b4" text-anchor="middle">No image</text></svg>`,
  );

/** Low-stock threshold that triggers Temu's "Almost sold out" urgency label. */
const LOW_STOCK_THRESHOLD = 60;

const asArray = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value.filter(Boolean) : []);
const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** `sellerRef` is a Firestore DocumentReference; we only need its id. */
function refId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.split("/").pop();
  if (typeof value === "object" && "id" in value) return String((value as { id: string }).id);
  return undefined;
}

function mapReview(raw: ProductReviewDocument, index: number): ProductReview {
  return {
    id: `${raw.customerName ?? "anon"}-${index}`,
    customerName: raw.customerName?.trim() || "Temu shopper",
    title: raw.title?.trim() || undefined,
    comment: raw.comment?.trim() ?? "",
    rating: asNumber(raw.rating, 5),
    verifiedPurchase: raw.verifiedPurchase ?? false,
    createdAt: toDate(raw.created_at),
  };
}

/**
 * Normalises one `products` document. Every field is treated as optional
 * because the existing catalogue is not uniform (some docs are missing
 * `description`, `reviews`, `sellerRef`, `subCategory`, ...).
 */
export function mapProduct(snapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Product {
  const raw = (snapshot.data() ?? {}) as ProductDocument;

  const price = asNumber(raw.price);
  const discountPercent = Math.max(0, Math.min(asNumber(raw.discountPercent), 95));
  // Firestore stores the *discounted* price plus a percentage, so the crossed
  // out "list price" has to be derived rather than read.
  const listPrice = discountPercent > 0 ? price / (1 - discountPercent / 100) : undefined;

  const images = asArray(raw.images);
  const reviewDocs = isNonEmptyArray(raw.productReviewsList)
    ? raw.productReviewsList
    : raw.reviews
      ? [raw.reviews]
      : [];
  const availableStock = asNumber(raw.availableStock);

  return {
    id: snapshot.id,
    name: raw.productName?.trim() || raw.productId?.trim() || "Untitled product",
    brand: raw.brandName?.trim() || undefined,
    category: raw.category?.trim() || "All",
    subCategory: raw.subCategory?.trim() || undefined,
    productType: raw.productType?.trim() || undefined,
    material: raw.material?.trim() || undefined,
    details: raw.productDetails?.trim() && raw.productDetails.trim() !== "-" ? raw.productDetails.trim() : undefined,
    descriptionParagraphs: asArray(raw.description),
    whatsInTheBox: asArray(raw.whatsInTheBox),
    tags: asArray(raw.tags),
    promotionalTags: asArray(raw.promotionalTags),
    images: images.length ? images : [PLACEHOLDER_IMAGE],
    descriptionImages: asArray(raw.descriptionImgs),
    price,
    listPrice,
    discountPercent,
    rating: Math.max(0, Math.min(asNumber(raw.ratings, 0), 5)),
    reviewCount: reviewDocs.length,
    soldQuantity: asNumber(raw.soldQuantity),
    availableStock,
    totalStock: asNumber(raw.totalStock),
    sponsored: raw.sponsored ?? false,
    reviews: reviewDocs.map(mapReview),
    sellerId: refId(raw.sellerRef),
    createdAt: toDate(raw.created_time),
    lowStock: availableStock > 0 && availableStock <= LOW_STOCK_THRESHOLD,
  };
}

export function mapCategory(snapshot: QueryDocumentSnapshot<DocumentData>): CategoryNode {
  const raw = snapshot.data() as {
    category?: string;
    categoryName?: string;
    subCategories?: { name?: string; tags?: string[]; img?: string; hot?: boolean }[];
  };
  return {
    id: snapshot.id,
    name: raw.categoryName?.trim() || raw.category?.trim() || snapshot.id,
    subCategories: asArray(raw.subCategories)
      .filter((s) => s.name?.trim())
      .map((s) => ({ name: s.name!.trim(), tags: asArray(s.tags), image: s.img || undefined, hot: s.hot })),
  };
}

export function mapOrder(snapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Order {
  const raw = (snapshot.data() ?? {}) as Partial<Order> & Record<string, unknown>;
  return {
    id: snapshot.id,
    orderId: (raw.orderId as string) || snapshot.id,
    orderBy: (raw.orderBy as string) ?? "",
    address: (raw.address as Order["address"]) ?? {
      customerName: "", phone: "", email: "", country: "", state: "", LGA: "", fullAddress: "",
    },
    orderItems: asArray(raw.orderItems as OrderItem[]),
    totalPrice: asNumber(raw.totalPrice),
    paymentMethod: (raw.paymentMethod as string) ?? "",
    paymentGateway: (raw.paymentGateway as string) ?? "",
    paymentReference: (raw.paymentReference as string) || snapshot.id,
    paymentStatus: ((raw.paymentStatus as string)?.toLowerCase() as Order["paymentStatus"]) || "pending",
    deliveryStatus: (raw.deliveryStatus as Order["deliveryStatus"]) ?? "Processing",
    additionalNote: (raw.additionalNote as string) ?? "",
    purchaseMailSent: Boolean(raw.purchaseMailSent),
    createdAt: toDate(raw.createdAt),
    paidAt: toDate(raw.paidAt),
  };
}
