import { cn } from "../../lib/utils";
import type { DeliveryStatus, PaymentStatus } from "../../types/commerce";

const PAYMENT_TONES: Record<PaymentStatus, string> = {
  paid: "bg-trust/10 text-trust",
  pending: "bg-brand-100 text-brand-700",
  processing: "bg-brand-100 text-brand-700",
  failed: "bg-deal/10 text-deal",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Payment pending",
  processing: "Processing",
  failed: "Payment failed",
};

const DELIVERY_TONES: Record<string, string> = {
  Delivered: "bg-trust/10 text-trust",
  "In Transit": "bg-brand-100 text-brand-700",
  "Out for Delivery": "bg-brand-100 text-brand-700",
  Processing: "bg-surface-sunken text-ink-2",
  Cancelled: "bg-deal/10 text-deal",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-bold", PAYMENT_TONES[status])}>
      {PAYMENT_LABELS[status] ?? status}
    </span>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-bold",
        DELIVERY_TONES[status] ?? "bg-surface-sunken text-ink-2",
      )}
    >
      {status}
    </span>
  );
}

/** Ordered delivery milestones; used for the order-detail progress tracker. */
export const DELIVERY_STEPS: DeliveryStatus[] = [
  "Processing",
  "In Transit",
  "Out for Delivery",
  "Delivered",
];
