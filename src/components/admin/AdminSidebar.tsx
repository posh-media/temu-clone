import {
  Box,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../store/AuthProvider";

const NAV = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/admins", icon: Box, label: "Admins" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { user, displayName, logOut } = useAuth();
  const location = useLocation();

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-md font-medium transition-colors",
      active ? "bg-brand text-white" : "text-ink-2 hover:bg-surface-muted hover:text-ink",
    );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white p-4 md:flex">
        <Link to="/admin" className="mb-6 px-2 text-2xl font-extrabold text-brand">
          Temu Admin
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              className={({ isActive }) => linkClass(isActive)}
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line pt-4">
          <p className="truncate px-3 text-sm font-medium text-ink">{displayName || user?.email}</p>
          <p className="truncate px-3 text-xs text-ink-3">{user?.email}</p>
          <button
            type="button"
            onClick={() => void logOut()}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-md font-medium text-ink-2 transition-colors hover:bg-surface-muted hover:text-deal"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] transform bg-white p-4 shadow-pop transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link to="/admin" className="mb-6 block px-2 text-2xl font-extrabold text-brand">
          Temu Admin
        </Link>
        <nav className="space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== "/admin" && location.pathname.startsWith(to));
            return (
              <Link key={to} to={to} onClick={onClose} className={linkClass(active)}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-line pt-4">
          <p className="truncate px-3 text-sm font-medium text-ink">{displayName || user?.email}</p>
          <button
            type="button"
            onClick={() => void logOut()}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-md font-medium text-ink-2 transition-colors hover:bg-surface-muted"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
