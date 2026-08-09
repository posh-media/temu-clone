# Stage 1 — Implementation Plan

Temu reference reimplementation · React + TypeScript + Vite + Tailwind CSS + Firebase

---

## 1. Repository inspection findings

The repository was **empty** (no `package.json`, no `src/`, no git history beyond an
uninitialised folder). There was therefore no existing React work to preserve and no
existing Firebase integration in code.

Consequently the project was scaffolded fresh with:

```
npm create vite@latest . -- --template react-ts
```

Dependencies added deliberately and nothing more:

| Package | Why |
| --- | --- |
| `firebase` | Firestore + Auth web SDK |
| `react-router-dom` | Routing (multi-page app, not conditional rendering) |
| `@tanstack/react-query` | Async cache for Firestore reads |
| `tailwindcss` (v3) + `postcss` + `autoprefixer` | Styling / design tokens |
| `lucide-react` | Icon set |
| `clsx` + `tailwind-merge` | The `cn()` class-merging helper |

`shadcn/ui` was **not** installed. Temu's UI is a dense, bespoke commerce design with
pill CTAs, tight 8px gutters and custom price typography; shadcn's Radix-based defaults
would have been fought rather than used. The equivalent primitives (`Button`, `Badge`,
`Modal`, `Drawer`, `Input`, `Select`, `Checkbox`, `Skeleton`) were written directly in
`src/components/ui/` in the same composable spirit, with focus trapping and ARIA wired up
by hand.

---

## 2. Firebase collections discovered

Inspected via the Firestore REST API against project `temu-r-b-b-t-tn1fc3`
(`scripts/probe-firestore.mjs` + `scripts/dump-firestore.mjs`). Security rules currently
allow unauthenticated reads. `listCollectionIds` is admin-only (403), so collection names
were probed by candidate name.

| Collection | Docs | Status |
| --- | --- | --- |
| `products` | **197** | Real catalogue — the primary data source |
| `categories` | 2 | Sparse / partially empty, used only as a secondary "curated collections" list |
| `sellers` | 11 | Referenced by `products.sellerRef`; documents are effectively empty (only ids) |
| `orders` | 17 | Real order documents — the schema new orders are written to match |

Probed and confirmed **absent/empty**: `users`, `carts`, `cart`, `cartItems`, `addresses`,
`reviews`, `banners`, `favorites`, `wishlist`, `notifications`, `brands`, `shops`,
`coupons`, `deals`, `payments`.

**No existing collection is renamed, migrated, restructured or deleted.** No fake
products are seeded — all 197 real products drive the UI.

### `products` document fields (observed)

Present on all 197 docs:
`productId`, `productName`, `brandName`, `category`, `productType`, `price`,
`discountPercent`, `ratings`, `soldQuantity`, `totalStock`, `availableStock`, `images[]`,
`tags[]`, `promotionalTags[]`, `whatsInTheBox[]`, `productDetails`, `created_time`.

Present on **most but not all** docs (must be handled as optional):
`sponsored` (196), `description[]` (195), `descriptionImgs[]` (195), `reviews{}` (195),
`sellerRef` (195), `productReviewsList[]` (195), `display` (195), `material` (195),
`harmful` (194), `subCategory` (194).

Observed value sets:

- `category`: `Speaker`, `Gadgets`, `Fashion`, `Electronics`, `Home`, `Automotive`, `Toys`, `Women`, `Men`
- `productType`: `solid`, `Gadgets`, `General`, `Electronic`, `Automotive`, `Jewelry`
- `promotionalTags`: `flash-sale`, `Limited Offer`, `Style Pick`, `Best Seller`
- `brandName`: 67 distinct brands
- `price`: min 8, median ~57,700, max ~61,000,000 — **no currency field**
- **No variant/colour/size fields exist anywhere in the catalogue**

### Key schema interpretations

1. **Prices are NGN.** `orders` documents carry `paymentGateway: "paystack"`, Nigerian
   states and an `LGA` field, and prices sit in the tens of thousands. All currency is
   formatted as `₦` via a single `src/lib/format.ts` module so Stage 2 can swap it.
2. **`discountPercent` applies to the stored `price`.** `price` is the *current* selling
   price, so the crossed-out list price is derived: `price / (1 - discountPercent/100)`.
3. **`reviews` vs `productReviewsList`.** `reviews` is a single map (the featured review);
   `productReviewsList` is the full array. The mapper prefers the array and falls back to
   the single map.
4. **`sellerRef`** is a real `DocumentReference` but `sellers` docs are empty, so only the
   id is surfaced (as a "Sold by" label). No seller page is built.
5. **`display: false`** means hidden. Because the field is missing on a few docs, the
   filter is `display !== false` applied client-side (a Firestore `!=` query would drop
   docs missing the field entirely).

### `orders` document shape (matched exactly when writing)

```
orderId, orderBy, address{customerName,phone,email,country,state,LGA,fullAddress},
orderItems[{qty, selected, docReference, item{productName,img,documentRef,
  selectedVariation,checkoutPrice,oldPrice,discountPercent,ratings,howManyLeft}}],
totalPrice, paymentMethod, paymentGateway, paymentReference,
paymentStatus, deliveryStatus, additionalNote, purchaseMailSent, createdAt, paidAt
```

New orders use the existing id format `ORD-TEMU-<9 digits>` and add one **additive**
field, `userId`, so orders can be filtered per signed-in shopper. Existing documents
predate it, so order history also matches on `orderBy`.

---

## 3. Data flow & state management strategy

```
Firestore
   ↓  src/services/*.ts        (queries + mappers, the only place the SDK is queried)
   ↓  src/hooks/useCatalogue   (React Query cache)
   ↓  src/store/*Provider      (cart / auth / favourites / checkout / toasts)
   ↓  src/components           (presentational + composed)
   ↓  src/pages                (route-level composition)
```

**The single most important decision:** the catalogue is small (197 docs) and Firestore
has **no full-text search**. So `fetchCatalogue()` reads the visible catalogue **once**
per session (React Query, `staleTime: 5min`) and all searching, filtering, sorting,
faceting and related-product logic runs in memory in `src/services/products.ts`. This
means:

- searching is instant and typo-tolerant in a way Firestore queries cannot be
- no Firestore read happens per keystroke, per render or per navigation
- the cart, favourites and search all share one cached array

State ownership:

| Concern | Where | Persistence |
| --- | --- | --- |
| Product data | React Query | in-memory cache |
| Cart | `CartProvider` | `localStorage` (**ids + qty only**, prices always re-read from Firestore) |
| Favourites | `FavoritesProvider` | `localStorage` (ids only) |
| Checkout draft | `CheckoutProvider` | `localStorage` |
| Auth session | `AuthProvider` → Firebase Auth | Firebase persistence |
| Addresses | `services/addresses.ts` | Firestore `users/{uid}/addresses` when signed in, `localStorage` for guests |
| Search / filters / sort | URL query string | shareable, back-button friendly |

No Redux/Zustand — React Context + React Query is sufficient and is the more useful thing
to learn here.

---

## 4. Routing structure

| Route | Page | Shell |
| --- | --- | --- |
| `/` | HomePage | storefront |
| `/search` | SearchPage (`?q`, `?category`, `?sort`, `?brand`, `?min`, `?max`, `?rating`, `?promo`) | storefront |
| `/product/:productId` | ProductPage | storefront |
| `/cart` | CartPage | storefront |
| `/favorites` | FavoritesPage | storefront |
| `/address` | AddressPage | storefront |
| `/orders` | OrdersPage | storefront |
| `/orders/:orderId` | OrderDetailPage | storefront |
| `/account` | AccountPage (auth required) | storefront |
| `/checkout` | CheckoutPage | focused |
| `/payment` | PaymentPage | focused |
| `/login`, `/signup` | Auth pages | focused |
| `*` | NotFoundPage | storefront |

Every route except `/` is lazily loaded via `React.lazy`.

---

## 5. Pages to build & major UI patterns identified

### Global
- Dismissible rotating **top announcement strip** (thin, dark, centred).
- **Desktop header**: logo · pill search bar with 2px orange border, camera icon and
  orange submit lozenge · quick links · favourites · hover account dropdown · cart with
  count badge.
- **Trust/guarantee bar** (free shipping, free returns, secure payments, delivery
  guarantee, price adjustment) — repeated in the footer.
- **Category nav**: "All category" hover mega-menu (category list → brands + trending
  products) plus inline category links; horizontal pill row on mobile with a left drawer.
- **Mobile shell**: compact header (menu / logo / cart) + search row + scrolling category
  pills; fixed 5-slot bottom tab bar.

### Homepage
Circular category rail → hero carousel (data-driven slides, autoplay, dots, swipe) →
Lightning deals rail with hourly countdown → 4 promo tiles → Best sellers rail →
Recently viewed → per-category rails → endless "More to love" grid.

### Search
URL-driven filters, desktop sidebar / mobile bottom-sheet, sort dropdown, result count,
active filter chips, skeleton + empty states, infinite reveal.

### Product detail
Gallery (thumbnail column + main image, mobile swipe + dots, zoom on hover) · title ·
price block with discount · rating + sold count · stock urgency · quantity stepper ·
Add to cart / Buy now · delivery estimate · trust strip · description accordion ·
what's in the box · specs · reviews with rating breakdown · related + recommended rails ·
sticky mobile action bar.

### Cart
Per-line selection checkboxes, select-all, qty steppers, remove, saved-for-later via
favourites, free-shipping progress bar, sticky summary (desktop aside / mobile bottom bar),
empty state.

### Address
List of address cards with default badge, add/edit modal form with validation
(name, phone, country, state, LGA, full address, postal code, set-default), delete
confirmation.

### Checkout
Two-column: address selector → delivery option → payment method → order note ·
right-hand order summary with itemised totals · Place order CTA.

### Payment
Method-specific UI (card / transfer / USSD / pay on delivery), amount summary, then
processing → success / failed / pending states, all driven off the created order document.

### Supporting
Login, Signup, Account, Orders, Order detail, Favorites, 404.

---

## 6. Responsive strategy

Mobile-first Tailwind. Breakpoints: `xs 420`, `sm 640`, `md 768` (mobile→desktop shell
switch), `lg 1024`, `xl 1280`, `3xl 1600`. Content is capped at `max-w-shell` (1500px).

Not a shrunken desktop: the header, navigation, product grid density, PDP layout, cart
summary and checkout each have a distinct mobile composition (bottom tab bar, bottom
sheets, sticky action bars, swipeable gallery).

Product grid columns: `2 → 3 (sm) → 4 (md) → 5 (lg) → 6 (xl)` with 8px gutters.

---

## 7. Implementation order (milestones)

1. ✅ Scaffold, Firebase inspection, design tokens, architecture
2. ✅ Layout / header / nav / footer / design system
3. ✅ Homepage
4. Search
5. Product detail
6. Cart
7. Address
8. Checkout
9. Payment
10. Auth / account / orders / supporting pages
11. Responsive refinement
12. Build, smoke test, docs

---

## 8. Items that required a judgement call (no blocker)

1. **Currency** — inferred as NGN from the Paystack/Nigeria evidence in `orders`. Isolated
   in `lib/format.ts`.
2. **Legacy price outliers** — a handful of docs have prices like `8` or `18` (clearly
   authored under a different currency). They are rendered as-is rather than mutated;
   Firestore is not modified.
3. **No variant data** — the PDP renders no colour/size selector because nothing in the
   catalogue supports it. `selectedVariation` is still written to orders (as `""`) to keep
   the existing order shape intact.
4. **Empty `sellers` docs** — no seller storefront page; only a "Sold by" label.
5. **Addresses have no Firestore home yet** — written to `users/{uid}/addresses` with a
   localStorage fallback for guests. Documented in `docs/FIREBASE.md`; nothing existing is
   changed.
6. **Payments are not connected to Paystack.** The payment page is a complete frontend
   flow behind a `PaymentProvider` seam. No fake credentials are used.
