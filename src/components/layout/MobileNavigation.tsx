import { CircleUser, Heart, Home, LayoutGrid, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useCart } from "../../store/CartProvider";
import { useFavorites } from "../../store/FavoritesProvider";

/** Temu's five-slot bottom tab bar, shown below the `md` breakpoint. */
export function MobileNavigation() {
  const { count } = useCart();
  const favorites = useFavorites();

  const tabs = [
    { to: "/", label: "Home", icon: Home, badge: 0, end: true },
    { to: "/search", label: "Categories", icon: LayoutGrid, badge: 0, end: false },
    { to: "/favorites", label: "Favorites", icon: Heart, badge: favorites.ids.length, end: false },
    { to: "/cart", label: "Cart", icon: ShoppingCart, badge: count, end: false },
    { to: "/account", label: "You", icon: CircleUser, badge: 0, end: false },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, badge, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs font-medium transition-colors",
                  isActive ? "text-brand" : "text-ink-3",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.8} />
                    {badge > 0 && (
                      <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-deal px-1 text-[9px] font-bold text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
