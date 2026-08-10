import { ChevronLeft, MapPin, PackageOpen, ReceiptText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  DELIVERY_STEPS, DeliveryStatusBadge, PaymentStatusBadge,
} from "../components/order/OrderStatus";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { SmartImage } from "../components/ui/SmartImage";
import { useOrder } from "../hooks/useOrders";
import { formatDate, formatPrice } from "../lib/format";
import { cn } from "../lib/utils";

/** Horizontal milestone tracker driven by `orders.deliveryStatus`. */
function DeliveryTracker({ status }: { status: string }) {
  const currentIndex = DELIVERY_STEPS.indexOf(status as (typeof DELIVERY_STEPS)[number]);
  if (status === "Cancelled") {
    return <p className="rounded-card bg-deal/10 px-3 py-2.5 text-md font-medium text-deal">This order was cancelled.</p>;
  }

  return (
    <ol className="flex items-start">
      {DELIVERY_STEPS.map((step, index) => {
        const done = currentIndex >= index;
        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", index === 0 ? "bg-transparent" : done ? "bg-brand" : "bg-line")} />
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-2xs font-bold",
                  done ? "bg-brand text-white" : "bg-line-2 text-ink-4",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  index === DELIVERY_STEPS.length - 1 ? "bg-transparent" : currentIndex > index ? "bg-brand" : "bg-line",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 px-1 text-center text-2xs md:text-xs",
                done ? "font-semibold text-ink" : "text-ink-4",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="shell space-y-3 py-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="shell py-3">
        <div className="rounded-card bg-white">
          <EmptyState
            icon={PackageOpen}
            title="Order not found"
            description={`We couldn't find an order with reference ${orderId}.`}
            action={
              <Link to="/orders">
                <Button>Back to your orders</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const itemsSubtotal = order.orderItems.reduce((sum, item) => sum + item.item.checkoutPrice * item.qty, 0);
  const shipping = Math.max(0, order.totalPrice - itemsSubtotal);

  return (
    <div className="shell py-3">
      <Link to="/orders" className="mb-2 inline-flex items-center gap-1 text-md font-medium text-ink-2 hover:text-brand">
        <ChevronLeft className="h-4 w-4" />
        All orders
      </Link>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {/* Status */}
          <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
            <div className="flex flex-wrap items-center gap-2 pb-4">
              <h1 className="font-mono text-lg font-bold">{order.id}</h1>
              <PaymentStatusBadge status={order.paymentStatus} />
              <DeliveryStatusBadge status={order.deliveryStatus} />
              <span className="ml-auto text-sm text-ink-3">Placed {formatDate(order.createdAt)}</span>
            </div>
            <DeliveryTracker status={order.deliveryStatus} />
          </section>

          {/* Items */}
          <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
            <h2 className="pb-2 text-lg font-bold">Items ({order.orderItems.length})</h2>
            <ul className="divide-y divide-line-2">
              {order.orderItems.map((entry, index) => {
                // `documentRef` looks like `products/<id>`; extract the id to link.
                const productId = entry.item.documentRef?.split("/").pop();
                return (
                  <li key={`${entry.docReference}-${index}`} className="flex items-start gap-3 py-3 first:pt-0">
                    <SmartImage
                      src={entry.item.img}
                      alt={entry.item.productName}
                      wrapperClassName="h-[72px] w-[72px] shrink-0 rounded-card bg-surface-sunken"
                    />
                    <div className="min-w-0 flex-1">
                      {productId ? (
                        <Link to={`/product/${productId}`} className="clamp-2 text-md text-ink hover:text-brand">
                          {entry.item.productName}
                        </Link>
                      ) : (
                        <p className="clamp-2 text-md text-ink">{entry.item.productName}</p>
                      )}
                      {entry.item.selectedVariation && (
                        <p className="mt-0.5 text-sm text-ink-3">{entry.item.selectedVariation}</p>
                      )}
                      <p className="mt-0.5 text-sm text-ink-3">Qty {entry.qty}</p>
                    </div>
                    <p className="shrink-0 text-md font-semibold tabular-nums text-ink">
                      {formatPrice(entry.item.checkoutPrice * entry.qty)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {order.additionalNote && (
            <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
              <h2 className="pb-1.5 text-lg font-bold">Delivery note</h2>
              <p className="text-md text-ink-2">{order.additionalNote}</p>
            </section>
          )}
        </div>

        <aside className="space-y-3">
          {/* Shipping address */}
          <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
            <h2 className="flex items-center gap-1.5 pb-2 text-lg font-bold">
              <MapPin className="h-4 w-4 text-ink-3" /> Shipping to
            </h2>
            <p className="text-md font-semibold text-ink">{order.address.customerName}</p>
            <p className="text-md text-ink-2">{order.address.phone}</p>
            {order.address.email && <p className="text-sm text-ink-3">{order.address.email}</p>}
            <p className="mt-1.5 text-md leading-relaxed text-ink-2">
              {[order.address.fullAddress, order.address.LGA, order.address.state, order.address.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </section>

          {/* Payment summary */}
          <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
            <h2 className="flex items-center gap-1.5 pb-2 text-lg font-bold">
              <ReceiptText className="h-4 w-4 text-ink-3" /> Payment
            </h2>
            <dl className="space-y-1 border-b border-line-2 pb-2.5">
              <div className="flex justify-between gap-3">
                <dt className="text-md text-ink-2">Items</dt>
                <dd className="text-md tabular-nums text-ink">{formatPrice(itemsSubtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-md text-ink-2">Shipping</dt>
                <dd className={cn("text-md tabular-nums", shipping === 0 ? "text-trust" : "text-ink")}>
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-md text-ink-2">Method</dt>
                <dd className="text-md text-ink">{order.paymentMethod || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-md text-ink-2">Gateway</dt>
                <dd className="text-md capitalize text-ink">{order.paymentGateway || "—"}</dd>
              </div>
              {order.paidAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-md text-ink-2">Paid on</dt>
                  <dd className="text-md text-ink">{formatDate(order.paidAt)}</dd>
                </div>
              )}
            </dl>
            <div className="flex items-baseline justify-between gap-3 pt-2.5">
              <span className="text-md font-bold">Order total</span>
              <span className="text-2xl font-extrabold text-brand">{formatPrice(order.totalPrice)}</span>
            </div>

            {order.paymentStatus !== "paid" && (
              <Link to={`/payment?ref=${order.id}`} className="mt-3 block">
                <Button block size="lg">
                  Complete payment
                </Button>
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
