import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import { firebaseApp } from "../lib/firebase";
import { COLLECTIONS, db } from "../lib/firebase";
import type { DeliveryStatus, Order, PaymentStatus } from "../types/commerce";
import { mapOrder } from "./mappers";

export type AdminOrder = Order;

/** Fetches all orders, newest first. Scales to ~1k docs via the limit. */
export async function fetchAdminOrders(max = 1000): Promise<AdminOrder[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map(mapOrder);
}

export async function fetchAdminOrderById(id: string): Promise<AdminOrder | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.orders, id));
  return snap.exists() ? mapOrder(snap) : null;
}

/** Fields an admin is allowed to update on an order. */
export interface OrderUpdateData {
  deliveryStatus: DeliveryStatus;
  expected_delivery: Date;
  additionalNote: string;
}

export async function updateOrder(id: string, data: OrderUpdateData): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.orders, id), {
    deliveryStatus: data.deliveryStatus,
    expected_delivery: Timestamp.fromDate(data.expected_delivery),
    additionalNote: data.additionalNote.trim(),
    updatedAt: serverTimestamp(),
  });
}

/** Deletes an order document. Does not touch payment provider records. */
export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.orders, id));
}

export const DELIVERY_STATUS_OPTIONS: DeliveryStatus[] = [
  "Processing",
  "In Transit",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["pending", "processing", "paid", "failed"];

export type OrderStatusFilter = "all" | PaymentStatus | DeliveryStatus;

export function matchesOrderFilter(order: AdminOrder, filter: OrderStatusFilter): boolean {
  if (filter === "all") return true;
  if (PAYMENT_STATUS_OPTIONS.includes(filter as PaymentStatus)) return order.paymentStatus === filter;
  return order.deliveryStatus === filter;
}

/**
 * Calls the `sendOrderEmail` Cloud Function to resend the order confirmation
 * email to the customer. Only admins can invoke this.
 */
export async function sendOrderEmail(orderId: string): Promise<{ recipientEmail: string }> {
  const functions = getFunctions(firebaseApp, "us-central1");
  const call = httpsCallable<{ orderId: string }, { recipientEmail: string }>(functions, "sendOrderEmail");
  const result = await call({ orderId });
  return result.data;
}
