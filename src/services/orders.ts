import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";
import { parseFlashSalePrice } from "../lib/flashSale";
import type { HydratedCartLine, Order, OrderAddress, OrderItem, PaymentStatus } from "../types/commerce";
import { mapOrder } from "./mappers";

/** Matches the existing id format in Firestore, e.g. `ORD-TEMU-28234000`. */
export function generateOrderReference() {
  return `ORD-TEMU-${Math.floor(100_000_000 + Math.random() * 899_999_999)}`;
}

/** Builds an `orderItems[]` entry in the exact shape existing orders use. */
function toOrderItem(line: HydratedCartLine): OrderItem {
  const { product } = line;
  const checkoutPrice = Math.round(line.lineTotal / Math.max(1, line.qty));
  const oldPrice = product.listPrice ?? product.price;
  const offer = parseFlashSalePrice(product.promotionalTags, product.price);

  const result: OrderItem = {
    qty: line.qty,
    selected: true,
    docReference: `products/${product.id}`,
    item: {
      productName: product.name,
      img: product.images[0] ?? "",
      documentRef: `products/${product.id}`,
      selectedVariation: line.variation ?? "",
      checkoutPrice,
      oldPrice,
      discountPercent: product.discountPercent,
      ratings: product.rating,
      howManyLeft: product.availableStock,
    },
  };

  if (offer && checkoutPrice === offer.price && checkoutPrice < product.price) {
    result.promotion = {
      tag: offer.tag,
      originalPrice: product.price,
      promoPrice: offer.price,
      type: "flash-sale",
    };
  }

  return result;
}

export interface CreateOrderInput {
  reference: string;
  address: OrderAddress;
  lines: HydratedCartLine[];
  totalPrice: number;
  paymentMethod: string;
  expectedDelivery: Date;
  note?: string;
  userId?: string;
}

/**
 * Writes a new document into the existing `orders` collection, keeping the
 * discovered field names (`orderBy`, `deliveryStatus`, `paymentGateway`, ...).
 * `userId` is additive so orders can be filtered per signed-in shopper.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const ref = doc(db, COLLECTIONS.orders, input.reference);
  const payload = {
    orderId: input.reference,
    orderBy: input.address.customerName,
    userId: input.userId ?? null,
    address: input.address,
    orderItems: input.lines.map(toOrderItem),
    totalPrice: Math.round(input.totalPrice),
    paymentMethod: input.paymentMethod,
    paymentGateway: "pending",
    paymentReference: input.reference,
    paymentStatus: "pending" as PaymentStatus,
    deliveryStatus: "Processing" as const,
    expected_delivery: Timestamp.fromDate(input.expectedDelivery),
    additionalNote: input.note ?? "",
    purchaseMailSent: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return mapOrder(snap);
}

export async function markOrderPaid(reference: string, status: PaymentStatus) {
  await updateDoc(doc(db, COLLECTIONS.orders, reference), {
    paymentStatus: status,
    ...(status === "paid" ? { paidAt: serverTimestamp(), deliveryStatus: "Processing" } : {}),
  });
}

export async function fetchOrderById(reference: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.orders, reference));
  return snap.exists() ? mapOrder(snap) : null;
}

/**
 * Orders for one shopper. Existing documents predate the `userId` field, so we
 * also match on `orderBy` (the customer name) to keep history visible.
 */
export async function fetchOrders(opts: { userId?: string; customerName?: string }): Promise<Order[]> {
  const results = new Map<string, Order>();
  const base = collection(db, COLLECTIONS.orders);

  const queries = [
    opts.userId ? query(base, where("userId", "==", opts.userId), limit(100)) : null,
    opts.customerName ? query(base, where("orderBy", "==", opts.customerName), limit(100)) : null,
  ].filter(Boolean);

  if (!queries.length) return [];

  for (const q of queries) {
    const snap = await getDocs(q!);
    snap.docs.forEach((d) => results.set(d.id, mapOrder(d)));
  }
  return [...results.values()].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/** Used by the demo "recent orders" view when nothing is signed in. */
export async function fetchRecentOrders(count = 20): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"), limit(count)));
  return snap.docs.map(mapOrder);
}
