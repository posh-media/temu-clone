import {
  ChevronDown, CircleUser, Heart, Menu, Package, ShoppingCart, Sparkles, Store,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../../store/CartProvider";
import { useAuth } from "../../store/AuthProvider";
import { useFavorites } from "../../store/FavoritesProvider";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { CategoryNav, CategoryDrawer } from "./CategoryNav";
import { TopBanner } from "./TopBanner";
import { TrustBar } from "./TrustBar";

/** Cart pill with the live item count badge. */
function CartButton({ compact = false }: { compact?: boolean }) {
  const { count } = useCart();
  return (
    <Link
      to="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-pill text-ink transition-colors hover:bg-surface-muted",
        compact ? "p-1.5" : "px-3 py-1.5",
      )}
    >
      <span className="relative">
        <ShoppingCart className="h-6 w-6" strokeWidth={1.8} />
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-pill bg-deal px-1 text-2xs font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {!compact && <span className="hidden text-md font-medium lg:inline">Cart</span>}
    </Link>
  );
}

/** Hover/click account menu, matching Temu's right-hand dropdown. */
function AccountMenu() {
  const { user, displayName, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const links = [
    { to: "/orders", label: "Your orders", icon: Package },
    { to: "/favorites", label: "Your favorites", icon: Heart },
    { to: "/address", label: "Your addresses", icon: Store },
    { to: "/account", label: "Account settings", icon: CircleUser },
  ];

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-ink transition-colors hover:bg-surface-muted"
      >
        <CircleUser className="h-6 w-6" strokeWidth={1.8} />
        <span className="hidden max-w-[110px] flex-col items-start leading-tight lg:flex">
          <span className="truncate text-2xs text-ink-3">{user ? "Hi," : "Sign in /"}</span>
          <span className="truncate text-sm font-semibold">{user ? displayName || "Account" : "Register"}</span>
        </span>
        <ChevronDown className={cn("hidden h-3.5 w-3.5 text-ink-3 transition-transform lg:block", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 w-60 animate-slide-down overflow-hidden rounded-xl border border-line bg-white pb-2 pt-3 shadow-pop"
        >
          {!user && (
            <div className="space-y-2 px-3 pb-3">
              <Link to="/login" className="block">
                <Button block size="md">Sign in</Button>
              </Link>
              <Link to="/signup" className="block">
                <Button block size="md" variant="outline">Register</Button>
              </Link>
            </div>
          )}
          <ul className="border-t border-line-2 pt-1">
            {links.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 text-md text-ink hover:bg-surface-muted"
                >
                  <Icon className="h-[18px] w-[18px] text-ink-3" />
                  {label}
                </Link>
              </li>
            ))}
            {user && (
              <li>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logOut()}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-md text-ink hover:bg-surface-muted"
                >
                  <CircleUser className="h-[18px] w-[18px] text-ink-3" />
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const QUICK_LINKS = [
  { to: "/search?sort=best-selling", label: "Best Sellers" },
  { to: "/search?sort=newest", label: "New arrivals" },
  { to: "/search?promo=flash-sale", label: "Lightning deals" },
];

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const favorites = useFavorites();

  return (
    <>
      <TopBanner />

      <header className="sticky top-0 z-40 border-b border-line bg-white shadow-nav md:shadow-none">
        {/* --- Desktop header --- */}
        <div className="shell hidden items-center gap-5 py-2.5 md:flex">
          <Logo height={26} />
          <div className="min-w-0 flex-1 lg:max-w-[620px]">
            <SearchBar />
          </div>

          <nav aria-label="Quick links" className="hidden items-center gap-4 xl:flex">
            {QUICK_LINKS.map(({ to, label }) => (
              <Link key={label} to={to} className="whitespace-nowrap text-md font-medium text-ink-2 hover:text-brand">
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link
              to="/favorites"
              aria-label={`Favorites, ${favorites.ids.length} saved`}
              className="relative rounded-pill p-2 text-ink hover:bg-surface-muted"
            >
              <Heart className="h-6 w-6" strokeWidth={1.8} />
              {favorites.ids.length > 0 && (
                <span className="absolute right-0 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-pill bg-deal px-1 text-2xs font-bold text-white">
                  {favorites.ids.length}
                </span>
              )}
            </Link>
            <AccountMenu />
            <CartButton />
          </div>
        </div>

        {/* --- Mobile header --- */}
        <div className="md:hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              aria-label="Open categories"
              onClick={() => setDrawerOpen(true)}
              className="rounded-full p-1.5 text-ink"
            >
              <Menu className="h-6 w-6" strokeWidth={1.8} />
            </button>
            <Logo height={20} />
            <div className="ml-auto flex items-center">
              <CartButton compact />
            </div>
          </div>
          <div className="px-3 pb-2">
            <SearchBar size="sm" />
          </div>
        </div>

        <TrustBar />
        <CategoryNav onOpenAll={() => setDrawerOpen(true)} />
      </header>

      <CategoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

/** Slim header for focused flows (checkout / payment) - no nav distractions. */
export function CheckoutHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="shell flex h-14 items-center gap-3">
        <Logo height={22} />
        <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        <NavLink to="/cart" className="ml-auto text-md font-medium text-ink-2 hover:text-brand">
          Back to cart
        </NavLink>
      </div>
      <div className="hidden bg-surface-muted md:block">
        <div className="shell flex items-center gap-1.5 py-1.5 text-sm text-ink-3">
          <Sparkles className="h-3.5 w-3.5 text-trust" />
          Secure checkout &middot; Your payment details are encrypted
        </div>
      </div>
    </header>
  );
}
