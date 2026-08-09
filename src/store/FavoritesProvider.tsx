import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useCatalogue } from "../hooks/useCatalogue";
import type { Product } from "../types/product";

interface FavoritesApi {
  ids: string[];
  products: Product[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  clear: () => void;
}

const FavoritesContext = createContext<FavoritesApi | null>(null);

/** Wishlist: ids in localStorage, products resolved from the cached catalogue. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useLocalStorage<string[]>("temu-clone:favorites", []);
  const { data: catalogue = [] } = useCatalogue();

  const api = useMemo<FavoritesApi>(() => {
    const idSet = new Set(ids);
    return {
      ids,
      products: catalogue.filter((p) => idSet.has(p.id)),
      has: (productId) => idSet.has(productId),
      toggle: (productId) => {
        const nowFavorite = !idSet.has(productId);
        setIds((current) =>
          nowFavorite ? [productId, ...current] : current.filter((id) => id !== productId),
        );
        return nowFavorite;
      },
      clear: () => setIds([]),
    };
  }, [ids, catalogue, setIds]);

  return <FavoritesContext.Provider value={api}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
