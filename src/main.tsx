import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./store/AuthProvider";
import { CartProvider } from "./store/CartProvider";
import { CheckoutProvider } from "./store/CheckoutProvider";
import { FavoritesProvider } from "./store/FavoritesProvider";
import { FlashSaleProvider } from "./store/FlashSaleProvider";
import { ToastProvider } from "./store/ToastProvider";
import "./index.css";

/**
 * One QueryClient for the whole app. Firestore data barely changes during a
 * session, so refetch-on-focus is off and the catalogue is cached for minutes -
 * this is what keeps navigation from re-reading Firestore.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <FlashSaleProvider>
            <CartProvider>
              <FavoritesProvider>
                <CheckoutProvider>
                  <App />
                </CheckoutProvider>
              </FavoritesProvider>
            </CartProvider>
          </FlashSaleProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
