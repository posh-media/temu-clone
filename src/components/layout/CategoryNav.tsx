import {
  Baby, Car, ChevronDown, Gem, LayoutGrid, Shirt, Smartphone, Sofa, Speaker, Sparkles, User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useCatalogue, useCategories } from "../../hooks/useCatalogue";
import { catalogueBrands, catalogueCategories } from "../../services/products";
import { cn } from "../../lib/utils";
import { Drawer } from "../ui/Modal";
import { SmartImage } from "../ui/SmartImage";

/** Icons for the categories that actually exist in Firestore. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Fashion: Shirt,
  Women: User,
  Men: Shirt,
  Electronics: Smartphone,
  Gadgets: Smartphone,
  Speaker: Speaker,
  Home: Sofa,
  Automotive: Car,
  Toys: Baby,
  Jewelry: Gem,
};

export const categoryIcon = (name: string): LucideIcon => CATEGORY_ICONS[name] ?? Sparkles;

export const categoryPath = (name: string) => `/search?category=${encodeURIComponent(name)}`;

/** Categories derived from the live catalogue, ordered by product count. */
function useNavCategories() {
  const { data: catalogue = [] } = useCatalogue();
  return useMemo(() => catalogueCategories(catalogue), [catalogue]);
}

/** Hover mega-menu behind Temu's "All category" button. */
function AllCategoryMenu() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: catalogue = [] } = useCatalogue();
  const categories = useNavCategories();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [location]);

  const active = activeCategory ?? categories[0]?.name;
  const panelBrands = useMemo(
    () => catalogueBrands(catalogue.filter((p) => p.category === active)).slice(0, 12),
    [catalogue, active],
  );
  const panelProducts = useMemo(
    () => catalogue.filter((p) => p.category === active).slice(0, 4),
    [catalogue, active],
  );

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 pr-4 text-md font-semibold text-ink hover:text-brand"
      >
        <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
        All category
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && categories.length > 0 && (
        <div className="absolute left-0 top-full z-50 flex w-[min(880px,92vw)] animate-slide-down overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <ul className="w-52 shrink-0 border-r border-line-2 py-2">
            {categories.map(({ name, count }) => {
              const Icon = categoryIcon(name);
              return (
                <li key={name}>
                  <Link
                    to={categoryPath(name)}
                    onMouseEnter={() => setActiveCategory(name)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-md",
                      name === active ? "bg-brand-50 font-semibold text-brand" : "text-ink hover:bg-surface-muted",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                    <span className="truncate">{name}</span>
                    <span className="ml-auto text-xs text-ink-4">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 flex-1 p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-bold">{active}</h3>
              <Link to={categoryPath(active ?? "")} className="text-md font-medium text-brand hover:underline">
                Shop all
              </Link>
            </div>

            {panelBrands.length > 0 && (
              <>
                <p className="mt-3 text-sm font-semibold text-ink-3">Popular brands</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {panelBrands.map(({ name }) => (
                    <Link
                      key={name}
                      to={`/search?q=${encodeURIComponent(name)}`}
                      className="rounded-pill bg-surface-muted px-2.5 py-1 text-sm text-ink-2 hover:bg-brand-50 hover:text-brand"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </>
            )}

            {panelProducts.length > 0 && (
              <>
                <p className="mt-4 text-sm font-semibold text-ink-3">Trending in {active}</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {panelProducts.map((product) => (
                    <Link key={product.id} to={`/product/${product.id}`} className="group">
                      <SmartImage
                        src={product.images[0]}
                        alt={product.name}
                        wrapperClassName="aspect-square w-full rounded-card bg-surface-sunken"
                      />
                      <p className="clamp-2 mt-1 text-xs text-ink-2 group-hover:text-brand">{product.name}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoryNav({ onOpenAll }: { onOpenAll: () => void }) {
  const categories = useNavCategories();
  const [params] = useSearchParams();
  const activeCategory = params.get("category");

  if (!categories.length) {
    return <div className="hidden h-10 border-t border-line-2 md:block" />;
  }

  return (
    <nav aria-label="Product categories" className="border-t border-line-2 bg-white">
      {/* Desktop: mega menu + inline links */}
      <div className="shell hidden items-center md:flex">
        <AllCategoryMenu />
        <ul className="no-scrollbar flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
          {categories.map(({ name }) => (
            <li key={name}>
              <Link
                to={categoryPath(name)}
                className={cn(
                  "flex h-10 items-center whitespace-nowrap border-b-2 text-md transition-colors",
                  activeCategory === name
                    ? "border-brand font-semibold text-brand"
                    : "border-transparent text-ink-2 hover:text-brand",
                )}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile: scrolling pill row */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-2 md:hidden">
        <button
          type="button"
          onClick={onOpenAll}
          className="flex shrink-0 items-center gap-1 rounded-pill bg-surface-muted px-2.5 py-1.5 text-sm font-semibold text-ink"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> All
        </button>
        {categories.map(({ name }) => (
          <Link
            key={name}
            to={categoryPath(name)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-pill px-3 py-1.5 text-sm transition-colors",
              activeCategory === name ? "bg-brand text-white font-semibold" : "bg-surface-muted text-ink-2",
            )}
          >
            {name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Full category list for mobile, including the Firestore `categories` docs. */
export function CategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useNavCategories();
  const { data: firestoreCategories = [] } = useCategories();

  return (
    <Drawer open={open} onClose={onClose} side="left" title="All categories">
      <ul className="space-y-1">
        {categories.map(({ name, count }) => {
          const Icon = categoryIcon(name);
          return (
            <li key={name}>
              <Link
                to={categoryPath(name)}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-md text-ink hover:bg-surface-muted"
              >
                <Icon className="h-5 w-5 text-brand" strokeWidth={1.8} />
                <span className="flex-1 truncate">{name}</span>
                <span className="text-sm text-ink-4">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {firestoreCategories.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-sm font-semibold text-ink-3">Curated collections</p>
          <ul className="space-y-1">
            {firestoreCategories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/search?q=${encodeURIComponent(category.subCategories[0]?.tags[0] ?? category.name)}`}
                  onClick={onClose}
                  className="block rounded-lg px-2 py-2.5 text-md text-ink hover:bg-surface-muted"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}
