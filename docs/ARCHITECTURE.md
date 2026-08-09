# Architecture

This is a high-fidelity, single-page React storefront that reimplements the Temu
shopping experience. The build target is the existing `temu-r-b-b-t-tn1fc3` Firebase
project.

---

## 1. Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build tool | Vite 6.x + `tsc -b` | Fast dev HMR, proper TypeScript project references |
| Framework | React 19 + TypeScript | Component-based UI with strict typing |
| Router | `react-router-dom` v7 data router (`createBrowserRouter`) | Supports `useBlocker` and lazy route chunks |
| Styling | Tailwind CSS v3 + custom tokens | Matches Temu's dense, pill-shaped design language |
| State (server) | `@tanstack/react-query` | Caches Firestore reads; catalogue rarely changes during a session |
| State (client) | Context + `useLocalStorage` | Cart, checkout draft, favorites, addresses, flash sale |
| Backend | Firebase: Auth, Firestore, Cloud Functions | Existing project; no custom backend needed beyond functions |
| Icons | `lucide-react` | Consistent, lightweight icon set |

---

## 2. Project structure

```
src/
  App.tsx                 # Data router & code-split route definitions
  main.tsx                # Provider tree (QueryClient, Auth, Toast, FlashSale, Cart, Favorites, Checkout)
  lib/                    # Pure helpers (format, flashSale, utils, firebase config)
  types/                  # Shared TypeScript contracts (product, commerce)
  services/               # Firestore read/write + payment/paystack orchestration
  hooks/                  # React Query hooks + useCountdown, useLocalStorage
  components/
    ui/                   # Primitives (Button, Badge, Modal, Input, etc.)
    layout/               # Header, Layout, TrustBar, CategoryNav
    product/              # Gallery, Cards, FlashSaleModal, QuantityStepper
    cart/                 # CartItem, CartSummary
    checkout/             # Address picker, payment method picker, order summary
    order/                # Order status and history
  pages/                  # Route components
  store/                  # Context providers
```

---

## 3. Provider order

`main.tsx` deliberately wraps the data router from the inside out:

```
QueryClientProvider
  AuthProvider
    ToastProvider
      FlashSaleProvider
        CartProvider
          FavoritesProvider
            CheckoutProvider
              <App />   # RouterProvider
```

This lets `CartProvider` read the active flash-sale session (for price overrides)
while `ProductPage` can use both `useCart` and `useFlashSale`. `RouterProvider`
inside `CheckoutProvider` means checkout/payment pages can still access the draft.

---

## 4. Data flow

1. **Catalogue** is fetched once and cached by `@tanstack/react-query`. Products,
   categories and sellers are read from Firestore in `useCatalogue`.
2. **Cart** only persists `productId + qty + selected + variation` in `localStorage`.
   Live product data is re-attached on every load, so prices never go stale.
3. **Checkout** reads the cart, lets the user pick an address, delivery option and
   payment method, then writes an `orders` document in the shape the existing
   backend already expects.
4. **Payment** either simulates pay-on-delivery locally, or calls the Paystack
   Cloud Functions, then redirects the user back for verification.
5. **Orders** are read back from Firestore using the same `mapOrder` mapper that
   understands the legacy document schema (`paymentReference`, `orderBy`,
   `purchaseMailSent`, etc.).

---

## 5. Route design

| Route | Shell | Notes |
| --- | --- | --- |
| `/` | `Layout` | Home feed with rails |
| `/search` | `Layout` | Category/tag/keyword results with sorting |
| `/product/:productId` | `Layout` | PDP with flash-sale modal + navigation guard |
| `/cart` | `Layout` | Cart + mobile sticky checkout bar |
| `/checkout` | none (focus shell) | Multi-step address/delivery/payment form |
| `/payment` | none (focus shell) | Paystack or simulated payment result |
| `/orders/:orderId` | `Layout` | Order detail + timeline |
| `/account`, `/address`, `/favorites`, `/orders` | `Layout` | Account surfaces |
| `/login`, `/signup` | none (focus shell) | Email + Google authentication |

---

## 6. Key patterns

- **Mapper-driven Firestore compatibility**: `services/mappers.ts` maps legacy
  documents to typed objects without changing the database.
- **Provider + localStorage**: all guest state survives refresh; signed-in users
  use Firestore where appropriate (`users/{uid}` for profiles, `addresses` for
  authenticated addresses).
- **Feature-flag for Paystack**: `VITE_PAYSTACK_ENABLED` in `.env.local` controls
  whether the real Cloud Functions are called in development; production builds
  default to using them.
- **Flash-sale as session state**: a limited-time session is stored in `localStorage`
  and controls cart price, quantity, and navigation guards.
