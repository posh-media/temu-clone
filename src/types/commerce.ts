import type { Product } from "./product";

/** A cart line. Only the id + qty are persisted; product data is re-fetched. */
export interface CartLine {
  productId: string;
  qty: number;
  selected: boolean;
  variation?: string;
  addedAt: number;
}

/** A cart line joined with its live product document. */
export interface HydratedCartLine extends CartLine {
  product: Product;
  lineTotal: number;
}

export interface CartTotals {
  itemCount: number;
  selectedCount: number;
  subtotal: number;
  listSubtotal: number;
  savings: number;
  shipping: number;
  total: number;
  /** How much more is needed to unlock free shipping (0 when unlocked). */
  amountToFreeShipping: number;
}

export interface Address {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  country: string;
  state: string;
  /** Local Government Area / city. Matches the `LGA` field used in `orders`. */
  lga: string;
  fullAddress: string;
  postalCode?: string;
  isDefault: boolean;
}

export type PaymentMethodId = "card" | "bank-transfer" | "ussd" | "mobile-money" | "pay-on-delivery";

export type PaymentStatus = "pending" | "processing" | "paid" | "failed";
export type DeliveryStatus =
  | "Processing"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

/** Mirrors the `orderItems[]` map stored in existing `orders` documents. */
export interface OrderItem {
  qty: number;
  selected: boolean;
  docReference: string;
  item: {
    productName: string;
    img: string;
    documentRef: string;
    selectedVariation: string;
    checkoutPrice: number;
    oldPrice: number;
    discountPercent: number;
    ratings: number;
    howManyLeft: number;
  };
  /** Optional promotion metadata for flash-sale and other promotional lines. */
  promotion?: {
    tag: string;
    originalPrice: number;
    promoPrice: number;
    type: "flash-sale";
  };
}

export interface OrderAddress {
  customerName: string;
  phone: string;
  email: string;
  country: string;
  state: string;
  LGA: string;
  fullAddress: string;
}

export interface Order {
  id: string;
  orderId: string;
  orderBy: string;
  address: OrderAddress;
  orderItems: OrderItem[];
  totalPrice: number;
  paymentMethod: string;
  paymentGateway: string;
  paymentReference: string;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  additionalNote: string;
  purchaseMailSent: boolean;
  createdAt?: Date;
  paidAt?: Date;
  expectedDelivery?: Date;
}

export interface CheckoutDraft {
  addressId?: string;
  paymentMethod: PaymentMethodId;
  note: string;
  orderReference?: string;
}
