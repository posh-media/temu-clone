import { ChevronRight, Heart, LogOut, MapPin, Package, ShoppingCart, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAddresses } from "../hooks/useAddresses";
import { useOrders } from "../hooks/useOrders";
import { formatDate } from "../lib/format";
import { useAuth } from "../store/AuthProvider";
import { useCart } from "../store/CartProvider";
import { useFavorites } from "../store/FavoritesProvider";
import { useToast } from "../store/ToastProvider";

export default function AccountPage() {
  const { user, displayName, logOut } = useAuth();
  const { data: orders = [] } = useOrders();
  const { addresses } = useAddresses();
  const favorites = useFavorites();
  const { totals } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const stats = [
    { label: "Orders", value: orders.length, to: "/orders", icon: Package },
    { label: "Favorites", value: favorites.ids.length, to: "/favorites", icon: Heart },
    { label: "Addresses", value: addresses.length, to: "/address", icon: MapPin },
    { label: "In cart", value: totals.itemCount, to: "/cart", icon: ShoppingCart },
  ];

  const links = [
    { label: "Your orders", description: "Track deliveries and view receipts", to: "/orders", icon: Package },
    { label: "Your addresses", description: "Manage shipping destinations", to: "/address", icon: MapPin },
    { label: "Your favorites", description: "Items you saved for later", to: "/favorites", icon: Heart },
  ];

  const unpaid = orders.filter((order) => order.paymentStatus !== "paid");

  return (
    <div className="shell py-3">
      {/* Profile header */}
      <section className="rounded-card bg-white px-3 py-4 md:px-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-50 text-xl font-bold text-brand">
            {(displayName || user?.email || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{displayName || "Your account"}</h1>
            <p className="truncate text-md text-ink-3">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            size="md"
            leadingIcon={<LogOut className="h-4 w-4" />}
            onClick={async () => {
              await logOut();
              toast("Signed out", "info");
              navigate("/");
            }}
          >
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ label, value, to, icon: Icon }) => (
            <li key={label}>
              <Link
                to={to}
                className="flex flex-col items-center gap-0.5 rounded-card bg-surface-muted py-3 transition-colors hover:bg-brand-50"
              >
                <Icon className="h-[18px] w-[18px] text-brand" strokeWidth={1.9} />
                <span className="text-xl font-bold text-ink">{value}</span>
                <span className="text-xs text-ink-3">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {unpaid.length > 0 && (
        <section className="mt-3 rounded-card bg-brand-50 px-3 py-3 md:px-4">
          <p className="text-md font-semibold text-brand-700">
            You have {unpaid.length} order{unpaid.length === 1 ? "" : "s"} awaiting payment
          </p>
          <ul className="mt-2 space-y-1.5">
            {unpaid.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link
                  to={`/payment?ref=${order.paymentReference}`}
                  className="flex items-center gap-2 text-md text-ink-2 hover:text-brand"
                >
                  <span className="font-mono">{order.paymentReference}</span>
                  <span className="text-sm text-ink-3">{formatDate(order.createdAt)}</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quick links */}
      <section className="mt-3 overflow-hidden rounded-card bg-white">
        <h2 className="border-b border-line-2 px-3 py-3 text-lg font-bold md:px-4">Account &amp; settings</h2>
        <ul>
          {links.map(({ label, description, to, icon: Icon }) => (
            <li key={to} className="border-b border-line-2 last:border-b-0">
              <Link to={to} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-muted md:px-4">
                <Icon className="h-5 w-5 shrink-0 text-ink-3" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block text-md font-medium text-ink">{label}</span>
                  <span className="block truncate text-sm text-ink-3">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" />
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-3 px-3 py-3 md:px-4">
            <UserRound className="h-5 w-5 shrink-0 text-ink-3" strokeWidth={1.8} />
            <span className="min-w-0 flex-1">
              <span className="block text-md font-medium text-ink">Profile details</span>
              <span className="block text-sm text-ink-3">
                Signed in with email &middot; managed by Firebase Authentication
              </span>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
