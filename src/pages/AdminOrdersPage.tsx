import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PaymentStatusBadge, DeliveryStatusBadge } from "../components/order/OrderStatus";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { SmartImage } from "../components/ui/SmartImage";
import { formatDate, formatPrice } from "../lib/format";
import { fetchAdminOrders, matchesOrderFilter, type OrderStatusFilter } from "../services/adminOrders";
import type { Order } from "../types/commerce";

const PAGE_SIZE = 20;

const FILTERS: { id: OrderStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "paid", label: "Paid" },
  { id: "failed", label: "Failed" },
  { id: "Processing", label: "Processing (Delivery)" },
  { id: "In Transit", label: "In Transit" },
  { id: "Out for Delivery", label: "Out for Delivery" },
  { id: "Delivered", label: "Delivered" },
  { id: "Cancelled", label: "Cancelled" },
];

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderStatusFilter>("all");
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchAdminOrders(),
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    let list = orders.filter((o) => matchesOrderFilter(o, filter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.orderBy.toLowerCase().includes(q) ||
          o.address.email?.toLowerCase().includes(q) ||
          o.address.phone.includes(q),
      );
    }
    return list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }, [orders, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="text-sm text-ink-3">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            placeholder="Search order ID, customer, email or phone"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as OrderStatusFilter); setPage(1); }}
          className="h-11 rounded-lg border border-line bg-white px-3 text-md"
        >
          {FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-card bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-card bg-white p-6 text-center text-deal">Failed to load orders.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center text-ink-3">
          <ShoppingBag className="mx-auto mb-2 h-8 w-8" />
          No orders found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-card">
            <table className="w-full min-w-[900px] text-left text-md">
              <thead className="bg-surface-muted text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {pageItems.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-3">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const itemCount = order.orderItems.reduce((sum, item) => sum + item.qty, 0);
  return (
    <tr className="hover:bg-surface-muted/50">
      <td className="px-4 py-3 font-mono text-sm font-medium">{order.id}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {order.orderItems.slice(0, 3).map((item, i) => (
              <SmartImage
                key={`${item.docReference}-${i}`}
                src={item.item.img}
                alt={item.item.productName}
                wrapperClassName="h-10 w-10 rounded bg-surface-sunken"
              />
            ))}
          </div>
          <div>
            <p className="font-medium text-ink">{order.orderBy}</p>
            <p className="text-xs text-ink-3">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-ink-2">{formatDate(order.createdAt)}</td>
      <td className="px-4 py-3"><PaymentStatusBadge status={order.paymentStatus} /></td>
      <td className="px-4 py-3"><DeliveryStatusBadge status={order.deliveryStatus} /></td>
      <td className="px-4 py-3 text-right font-semibold">{formatPrice(order.totalPrice)}</td>
      <td className="px-4 py-3 text-right">
        <Link to={`/admin/orders/${order.id}`}>
          <Button variant="outline" size="sm">View</Button>
        </Link>
      </td>
    </tr>
  );
}
