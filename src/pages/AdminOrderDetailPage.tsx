import { ArrowLeft, PackageOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentStatusBadge, DeliveryStatusBadge } from "../components/order/OrderStatus";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { SmartImage } from "../components/ui/SmartImage";
import { formatPrice, addDays } from "../lib/format";
import { DELIVERY_STATUS_OPTIONS, deleteOrder, fetchAdminOrderById, updateOrder } from "../services/adminOrders";
import { logAdminAction } from "../services/audit";
import { useAuth } from "../store/AuthProvider";
import type { DeliveryStatus } from "../types/commerce";

export default function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["admin", "order", orderId || ""],
    queryFn: () => fetchAdminOrderById(orderId!),
    enabled: Boolean(orderId),
    staleTime: 60 * 1000,
  });

  const [status, setStatus] = useState<DeliveryStatus>("Processing");
  const [expected, setExpected] = useState<string>("");
  const [note, setNote] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Order ID missing");
      const data = {
        deliveryStatus: status,
        expected_delivery: expected ? new Date(expected) : addDays(new Date(), 7),
        additionalNote: note,
      };
      await updateOrder(orderId, data);
      await logAdminAction({
        adminUid: user!.uid,
        adminEmail: user!.email,
        action: "ORDER_UPDATED",
        targetType: "order",
        targetId: orderId,
        after: { deliveryStatus: data.deliveryStatus, expected_delivery: data.expected_delivery.toISOString() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId!] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Order ID missing");
      await deleteOrder(orderId);
      await logAdminAction({
        adminUid: user!.uid,
        adminEmail: user!.email,
        action: "ORDER_DELETED",
        targetType: "order",
        targetId: orderId,
        before: { totalPrice: order?.totalPrice, customer: order?.orderBy },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      navigate("/admin/orders");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-card bg-white p-6">
        <EmptyState
          icon={PackageOpen}
          title="Order not found"
          description={`We couldn't find order ${orderId}.`}
          action={
            <Link to="/admin/orders">
              <Button>Back to orders</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin/orders" className="rounded p-1 text-ink-3 hover:bg-surface-muted hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-ink">Order {order.id}</h1>
          <PaymentStatusBadge status={order.paymentStatus} />
          <DeliveryStatusBadge status={order.deliveryStatus} />
        </div>
        <Button variant="outline" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
          Delete order
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="rounded-card bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold">Items</h2>
            <ul className="divide-y divide-line-2">
              {order.orderItems.map((entry, index) => (
                <li key={`${entry.docReference}-${index}`} className="flex items-start gap-3 py-3 first:pt-0">
                  <SmartImage
                    src={entry.item.img}
                    alt={entry.item.productName}
                    wrapperClassName="h-16 w-16 shrink-0 rounded-card bg-surface-sunken"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{entry.item.productName}</p>
                    {entry.item.selectedVariation && (
                      <p className="text-sm text-ink-3">{entry.item.selectedVariation}</p>
                    )}
                    <p className="text-sm text-ink-3">Qty {entry.qty}</p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatPrice(entry.item.checkoutPrice * entry.qty)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-card bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold">Customer</h2>
            <dl className="grid gap-2 text-md sm:grid-cols-2">
              <div><dt className="text-ink-3">Name</dt><dd className="font-medium">{order.orderBy}</dd></div>
              <div><dt className="text-ink-3">Phone</dt><dd className="font-medium">{order.address.phone}</dd></div>
              <div><dt className="text-ink-3">Email</dt><dd className="font-medium">{order.address.email || "—"}</dd></div>
              <div><dt className="text-ink-3">Address</dt><dd className="font-medium">{order.address.fullAddress}</dd></div>
              <div><dt className="text-ink-3">LGA / State</dt><dd className="font-medium">{order.address.LGA}, {order.address.state}</dd></div>
              <div><dt className="text-ink-3">Country</dt><dd className="font-medium">{order.address.country}</dd></div>
            </dl>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-card bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold">Payment summary</h2>
            <dl className="space-y-2 text-md">
              <div className="flex justify-between"><dt className="text-ink-3">Subtotal</dt><dd>{formatPrice(order.orderItems.reduce((s, i) => s + i.item.checkoutPrice * i.qty, 0))}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Payment method</dt><dd>{order.paymentMethod || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Provider</dt><dd>{order.paymentGateway || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Reference</dt><dd className="font-mono text-xs">{order.paymentReference}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt className="font-bold">Total</dt><dd className="text-xl font-bold text-brand">{formatPrice(order.totalPrice)}</dd></div>
            </dl>
          </section>

          <section className="rounded-card bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold">Admin actions</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4"
            >
              <Select
                label="Delivery status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
              >
                {DELIVERY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input
                label="Expected delivery"
                type="date"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
              <Textarea
                label="Additional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {updateMutation.isSuccess && (
                <p className="rounded bg-trust/10 px-3 py-2 text-sm text-trust">Order updated.</p>
              )}
              {updateMutation.isError && (
                <p className="rounded bg-deal/10 px-3 py-2 text-sm text-deal">
                  {updateMutation.error instanceof Error ? updateMutation.error.message : "Update failed."}
                </p>
              )}
              <Button type="submit" block loading={updateMutation.isPending}>Update order</Button>
              <p className="text-xs text-ink-3">
                Payment status cannot be changed here. It is controlled by Paystack / KoraPay verification.
              </p>
            </form>
          </section>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete order"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button variant="deal" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>Delete</Button>
          </div>
        }
      >
        <div className="space-y-2 text-md text-ink">
          <p>Are you sure you want to permanently delete this order?</p>
          <p className="font-mono text-sm text-ink-3">ID: {order.id}</p>
          <p>Customer: <strong>{order.orderBy}</strong></p>
          <p>Total: <strong>{formatPrice(order.totalPrice)}</strong></p>
          <p className="text-sm text-deal">This does not affect any payment provider records.</p>
        </div>
      </Modal>
    </div>
  );
}
