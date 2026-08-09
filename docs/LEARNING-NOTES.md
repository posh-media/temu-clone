# Learning Notes

Things discovered and decided while building this stage.

---

## 1. Data router vs `BrowserRouter`

`react-router-dom` v7 exposes `useBlocker` only inside a data router
(`createBrowserRouter` / `RouterProvider`). The original `BrowserRouter` +
`<Routes>` tree could not host the flash-sale navigation guard, so the app was
migrated to a data router with `Layout` as a parent route and `Suspense` around
lazy page components. Error boundaries are placed around each route element and
as the route `errorElement`.

---

## 2. Paystack must be a real backend call

The Paystack `initialize` and `verify` calls happen in Cloud Functions, not the
browser. The secret key is never present in the frontend bundle. The frontend
only receives a redirect URL and `paymentId`. Because the functions are not
deployed in the local smoke-test environment, a feature flag
(`VITE_PAYSTACK_ENABLED`) falls back to a local simulation during `npm run dev`.

---

## 3. Smoke test resilience

`scripts/smoke-flow.mjs` was made more robust during this stage:

- Pick the **visible** search input (`#site-search:visible`) because both mobile
  and desktop headers mount an input.
- Use the first product `href` captured on the home page instead of navigating
  back to home after an empty search.
- Target `:visible` CTA buttons for "Add to cart" and "Checkout" because the
  product and cart pages render both desktop and mobile variants.
- Ignore `ERR_ABORTED` request failures (normal Firestore listener teardown on
  navigation).

---

## 4. Firebase Auth persistence

`setPersistence(auth, browserLocalPersistence)` is required so a Google or
email/password user stays signed in across refresh. Without it, `AuthProvider`
reports a new `null` user on each app load.

---

## 5. Cart price freshness

Only `productId`, `quantity`, `selected` and `variation` are stored in
`localStorage`. On hydration, `CartProvider` joins these with the live catalogue
from `@tanstack/react-query`. This keeps item prices, names and stock in sync
without duplicating mutable product fields in the cart store.

---

## 6. Flash-sale parsing

Flash-sale information is not a first-class document; it is inferred from free
-text `promotionalTags` on products. The parser looks for price, discount,
quantity and expiry patterns so any product can become a "flash sale" just by
changing its tags.

---

## 7. Order mappers

The existing `orders` collection in Firestore uses `paymentReference`,
`orderBy`, `purchaseMailSent` and a flat address object. A single `mapOrder`
mapper in `src/services/mappers.ts` translates these into the typed
`OrderDetail` shape without modifying the database, preserving compatibility
with the FlutterFlow backend.

---

## 8. Firebase Cloud Function deployment

`paystackInitialize` and `paystackVerify` are now deployed to `us-central1` and
the `paystackInitialize` endpoint returns a valid `accessCode`. A runtime bug in
`paystack_initialize.js` (`orderSnap.exists()` instead of `orderSnap.exists`) was
fixed and the `functions.config()` fallback was removed in favor of `process.env.PAYSTACK_SECRET_KEY`
to avoid the upcoming Cloud Runtime Configuration shutdown.

A full real-card payment could not be completed in the Playwright test harness
because Paystack's checkout iframe did not render its form in this environment
(`ERR_SSL_BAD_RECORD_MAC_ALERT`). `paystackVerify` was confirmed to reach Paystack
and return a proper response.

## 9. Version notes

- `react-router-dom` v7 `useBlocker` signature returns a `Blocker` object with
  `state`, `proceed` and `reset`.
- Vite v8 + rolldown builds fast but warns about a large `vendor-firebase.js`
  chunk. That chunk is acceptable for a first stage; future work can split it
  further with manual dynamic imports.
- `oxlint` flags `react/only-export-components` warnings. These are treated as
  informational for hooks and constants; the build and smoke tests pass with
  zero errors.
