import {
  Box,
  Eye,
  EyeOff,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SmartImage } from "../components/ui/SmartImage";
import { formatPrice } from "../lib/format";
import { cn } from "../lib/utils";
import { COLLECTIONS, db } from "../lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";
import type { Order } from "../types/commerce";
import type { Product } from "../types/product";
import { fetchAdminOrders } from "../services/adminOrders";
import { fetchAdminProducts } from "../services/adminProducts";
import { fetchAdmins } from "../services/admin";

interface Stats {
  products: number;
  visible: number;
  hidden: number;
  orders: number;
  pendingPayment: number;
  paidOrders: number;
  failedOrders: number;
  customers: number;
  admins: number;
  revenue: number;
  recentOrders: Order[];
  recentProducts: Product[];
}

async function loadStats(): Promise<Stats> {
  const [productsSnap, customersSnap, admins, orders, products] = await Promise.all([
    getCountFromServer(collection(db, COLLECTIONS.products)),
    getCountFromServer(collection(db, COLLECTIONS.users)),
    fetchAdmins(50),
    fetchAdminOrders(50),
    fetchAdminProducts(20),
  ]);

  const visible = products.filter((p) => p.visible).length;
  const pendingPayment = orders.filter((o) => o.paymentStatus !== "paid" && o.paymentStatus !== "failed").length;
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid").length;
  const failedOrders = orders.filter((o) => o.paymentStatus === "failed").length;
  const revenue = orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.totalPrice, 0);

  return {
    products: productsSnap.data().count,
    visible,
    hidden: productsSnap.data().count - visible,
    orders: orders.length,
    pendingPayment,
    paidOrders,
    failedOrders,
    customers: customersSnap.data().count,
    admins: admins.length,
    revenue,
    recentOrders: orders.slice(0, 5),
    recentProducts: products.slice(0, 5),
  };
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "brand" | "deal" | "trust" | "ink";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand",
    deal: "bg-deal/10 text-deal",
    trust: "bg-trust/10 text-trust",
    ink: "bg-ink/5 text-ink",
  };
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className={cn("mb-3 inline-flex rounded-lg p-2", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-ink-3">{label}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-28 rounded-card bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-card bg-white p-6 text-center text-deal">
        Failed to load dashboard: {error || "unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total products" value={stats.products} icon={Package} />
        <StatCard label="Visible products" value={stats.visible} icon={Eye} tone="trust" />
        <StatCard label="Hidden products" value={stats.hidden} icon={EyeOff} tone="ink" />
        <StatCard label="Total orders" value={stats.orders} icon={ShoppingBag} tone="deal" />
        <StatCard label="Pending payment" value={stats.pendingPayment} icon={Box} />
        <StatCard label="Paid orders" value={stats.paidOrders} icon={TrendingUp} tone="trust" />
        <StatCard label="Failed/cancelled" value={stats.failedOrders} icon={Box} tone="deal" />
        <StatCard label="Total revenue" value={formatPrice(stats.revenue)} icon={TrendingUp} tone="trust" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-line-2">
            {stats.recentOrders.map((order) => (
              <li key={order.id} className="py-3">
                <Link to={`/admin/orders/${order.id}`} className="block hover:text-brand">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{order.id}</span>
                    <span className="text-sm text-ink-3">{formatPrice(order.totalPrice)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-3">
                    <span className="capitalize">{order.paymentStatus}</span>
                    <span>•</span>
                    <span>{order.orderItems.reduce((s, i) => s + i.qty, 0)} items</span>
                    <span>•</span>
                    <span>{order.orderBy}</span>
                  </div>
                </Link>
              </li>
            ))}
            {stats.recentOrders.length === 0 && <p className="py-6 text-center text-ink-3">No orders yet.</p>}
          </ul>
        </section>

        <section className="rounded-card bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent products</h2>
            <Link to="/admin/products" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-line-2">
            {stats.recentProducts.map((product) => (
              <li key={product.id} className="flex items-center gap-3 py-3">
                <SmartImage
                  src={product.images[0]}
                  alt={product.name}
                  wrapperClassName="h-12 w-12 rounded bg-surface-sunken"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/products/${product.id}`} className="block truncate font-medium hover:text-brand">
                    {product.name}
                  </Link>
                  <p className="text-xs text-ink-3">
                    {product.category} • {formatPrice(product.price)} • {product.visible ? "Visible" : "Hidden"}
                  </p>
                </div>
              </li>
            ))}
            {stats.recentProducts.length === 0 && <p className="py-6 text-center text-ink-3">No products.</p>}
          </ul>
        </section>
      </div>
    </div>
  );
}
