import { ChevronRight, PackageOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DeliveryStatusBadge, PaymentStatusBadge } from "../components/order/OrderStatus";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { SmartImage } from "../components/ui/SmartImage";
import { useOrders } from "../hooks/useOrders";
import { formatDate, formatPrice } from "../lib/format";
import { cn } from "../lib/utils";
import { useAuth } from "../store/AuthProvider";
import type { Order } from "../types/commerce";

const TABS = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function matchesTab(order: Order, tab: TabId) {
  switch (tab) {
    case "unpaid": return order.paymentStatus !== "paid";
    case "processing": return order.deliveryStatus === "Processing";
    case "shipped": return order.deliveryStatus === "In Transit" || order.deliveryStatus === "Out for Delivery";
    case "delivered": return order.deliveryStatus === "Delivered";
    default: return true;
  }
}

function OrderCard({ order }: { order: Order }) {
  const itemCount = order.orderItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <li className="rounded-card bg-white">
      <Link to={`/orders/${order.id}`} className="block px-3 py-3 md:px-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-2 pb-2.5">
          <span className="font-mono text-sm font-medium text-ink">{order.id}</span>
          <PaymentStatusBadge status={order.paymentStatus} />
          <DeliveryStatusBadge status={order.deliveryStatus} />
          <span className="ml-auto flex items-center text-sm text-ink-3">
            {formatDate(order.createdAt)}
            <ChevronRight className="ml-1 h-4 w-4" />
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2.5">
          <div className="flex gap-1.5">
            {order.orderItems.slice(0, 4).map((item, i) => (
              <SmartImage
                key={`${item.docReference}-${i}`}
                src={item.item.img}
                alt={item.item.productName}
                wrapperClassName="h-14 w-14 shrink-0 rounded bg-surface-sunken"
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="clamp-1 text-md text-ink">{order.orderItems[0]?.item.productName ?? "Order"}</p>
            <p className="text-sm text-ink-3">
              {itemCount} item{itemCount === 1 ? "" : "s"} &middot; {order.address.LGA}, {order.address.state}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-ink-3">Total</p>
            <p className="text-lg font-bold text-brand">{formatPrice(order.totalPrice)}</p>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useOrders();
  const [tab, setTab] = useState<TabId>("all");

  const filtered = useMemo(() => orders.filter((order) => matchesTab(order, tab)), [orders, tab]);

  if (!user) {
    return (
      <div className="shell py-3">
        <h1 className="pb-3 text-2xl font-bold">Your orders</h1>
        <div className="rounded-card bg-white">
          <EmptyState
            icon={PackageOpen}
            title="Sign in to see your orders"
            description="Your order history is linked to your account."
            action={
              <div className="flex gap-2">
                <Link to="/login">
                  <Button>Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline">Create account</Button>
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-3">
      <h1 className="pb-2.5 text-2xl font-bold">Your orders</h1>

      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-pill px-3.5 py-1.5 text-md transition-colors",
              tab === id ? "bg-brand font-semibold text-white" : "bg-white text-ink-2 hover:text-brand",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[150px] w-full rounded-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card bg-white">
          <EmptyState
            icon={PackageOpen}
            title={orders.length === 0 ? "No orders yet" : `No ${tab} orders`}
            description={
              orders.length === 0
                ? "When you place an order it will appear here with live delivery status."
                : "Try a different tab to see your other orders."
            }
            action={
              <Link to="/">
                <Button>Start shopping</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
