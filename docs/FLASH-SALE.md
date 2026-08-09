# Flash Sale

A promotional flash-sale flow lets users claim a time-limited special price. The
logic is built around "promotional tags" embedded in product data and a session
stored in `localStorage`.

---

## 1. Detection

`src/lib/flashSale.ts` parses product promotional tags into a `FlashSaleInfo` object:

```ts
interface FlashSaleInfo {
  active: boolean;
  label: string;          // e.g. "Flash Sale"
  price?: number;         // discounted price, if found in tags like ₦12,500
  oldPrice?: number;
  discount?: number;      // percent off, e.g. 50
  quantity?: number;      // max claim per session, e.g. 2
  endsAt?: Date;          // expiry from the tag string
  urgency?: string;       // tag text like "Only 10 left"
  claimed: boolean;       // whether user already claimed this product
}
```

Rules:

- Promotional tags are searched for keywords: `flash`, `sale`, `deal`, `lightning`, `limited`, `promo`.
- If a tag contains a price (e.g. `₦12,500`), it is treated as the special price.
- If a tag contains a percentage (e.g. `50% off`), it is treated as a discount.
- If a tag contains `only` + a number, it is treated as max quantity/urgency.
- The first future expiry date in the tags is used as `endsAt`; otherwise it defaults
  to a configurable `DEFAULT_FLASH_DURATION`.

---

## 2. Session

`FlashSaleProvider` (`src/store/FlashSaleProvider.tsx`) holds the in-memory + persisted state:

- `session.productId` — which product the user is currently in a flash sale for.
- `session.endsAt` — countdown end time.
- `session.quantity` — how many units the user claimed.
- `session.completed` — whether the claim was finalised by checkout/payment.

Session is stored in `localStorage` with key `temu-clone:flash-sale-session`.

### Claim flow

1. Product page detects `active` flash sale.
2. On mount, `FlashSaleProvider` opens a `FlashSaleModal`.
3. User clicks **Claim now**.
4. Provider creates a session, `CartProvider` adds the item at the special price,
   and `QuantityStepper` shows a `max` equal to the claim limit.
5. A countdown overlay appears on the product page (`FlashSaleCountdown`).
6. When the timer expires, the cart line is removed and the session is cleared.

---

## 3. Cart restrictions

`src/store/CartProvider.tsx` and `src/components/cart/CartItem.tsx` enforce:

- Only one flash-sale line per cart (the active session).
- A flash-sale item cannot have `qty > max`.
- A flash-sale item's price is frozen at the claimed price until payment completes.
- If a flash-sale session is active and the user tries to add a different product
  from the product page, the action is blocked with a toast asking them to
  continue the current flash sale.
- When the timer expires, `useEffect` in `CartProvider` auto-removes the expired
  flash-sale line and notifies the user.

---

## 4. Navigation guard

`ProductPage` uses `react-router-dom`'s `useBlocker` to intercept navigation while
an active flash-sale session is in progress. The guard shows a `Modal` with two
choices:

- **Checkout now** — proceeds the user to `/cart`.
- **Leave anyway** — resets the flash sale and allows the navigation.

The `beforeunload` event is also attached so tab-closes/reloads trigger the browser
native unsaved-changes prompt.

---

## 5. Completion

- On successful payment, `PaymentPage` calls `flashSale.markCompleted()` and
  `CartProvider.clearSelected()` to clear the paid flash-sale item.
- `markCompleted()` sets `completed: true` in `localStorage` so the same product
  cannot be re-claimed in a new session until the user refreshes or the promo
  expires.

---

## 6. Manual expiry

The `FlashSaleCountdown` component on the product page resets the session when it
reaches zero. A fallback `useEffect` in `FlashSaleProvider` also runs every minute
to clean up expired sessions.
