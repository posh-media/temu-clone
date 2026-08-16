# Payments

The application supports multiple payment providers and a local pay-on-delivery option.

Supported providers:

- **Paystack** — card, bank transfer, USSD, mobile money.
- **KoraPay** — card, bank transfer, pay with bank, mobile money.
- **Pay on delivery** — local simulation; no online payment.

---

## 1. Frontend flow

```
CheckoutPage
  └─ user picks payment method ──> createOrder in Firestore
                                   paymentMethod = "card" | "bank_transfer" | "ussd" | "mobile_money" | "pay_on_delivery"
PaymentPage
  ├─ select provider (Paystack / KoraPay) if both enabled
  ├─ method = pay-on-delivery     => local simulation => "pending"
  ├─ provider = paystack          => paystackInitialize => PaystackPop.resumeTransaction(accessCode)
  └─ provider = korapay           => korapayInitialize => redirect to checkout_url

Provider callbacks
  ├─ Paystack inline / redirect  => verifyPayment("paystack", reference) => "paid" | "pending" | "failed"
  └─ KoraPay redirect            => verifyPayment("korapay", reference)  => "paid" | "pending" | "failed"

Backend webhooks
  ├─ paystackWebhook  => confirms payment independently and idempotently
  └─ korapayWebhook   => confirms payment independently and idempotently
```

---

## 2. Provider availability

Provider availability is controlled by Vite environment variables. These are build-time values; the Vercel production build must have the values you want.

```ini
# .env.local / Vercel
VITE_ENABLE_PAYSTACK_PAYMENT=true
VITE_ENABLE_KORAPAY_PAYMENT=true
```

| Paystack | KoraPay | UI result |
|----------|---------|-----------|
| `true`   | `true`  | Both providers shown |
| `true`   | `false` | Paystack only |
| `false`  | `true`  | KoraPay only |
| `false`  | `false` | No online provider; only pay-on-delivery is offered |

The legacy `VITE_PAYSTACK_ENABLED` flag is still honored as a fallback.

---

## 3. Configurable payment methods

Which payment methods appear on the checkout/payment pages is controlled at build time by `VITE_PAYMENT_METHODS`:

```ini
VITE_PAYMENT_METHODS=["card","bank_transfer"]
```

Supported values: `card`, `bank_transfer`, `ussd`, `mobile_money`, `pay_on_delivery`. Invalid entries are ignored. If the variable is missing or malformed, all supported methods are shown.

Because this is a Vite build-time variable, changing it requires a new Vercel build/deployment.

The UI also filters the enabled methods by the selected provider. For example, USSD is not offered when KoraPay is selected, because KoraPay does not support it.

## 4. Payment method → channel mapping

The UI stores the normalized channel string in `orders.paymentMethod`:

| UI label | Stored value | Paystack channel | KoraPay channel |
|----------|--------------|------------------|-----------------|
| Debit/credit card | `card` | `card` | `card` |
| Bank transfer | `bank_transfer` | `bank_transfer` | `bank_transfer` |
| USSD | `ussd` | `ussd` | not supported (hidden when KoraPay is selected) |
| Mobile money | `mobile_money` | `mobile_money` | `mobile_money` |
| Pay on delivery | `pay_on_delivery` | local only | local only |

The backend converts the stored value into a `channels: [channel]` array before calling either gateway. Legacy uppercase values such as `CARD`, `TRANSFER`, and `POD` are still accepted.

---

## 4. Paystack integration

### Frontend files

- `src/services/paystack.ts` — wrappers around `paystackInitialize` and `paystackVerify` callable functions.
- `src/services/payments.ts` — provider routing and availability helpers.
- `src/pages/PaymentPage.tsx` — orchestrates provider selection, initialization, redirect, verification, and result UIs.
- `src/components/checkout/PaymentMethodPicker.tsx` — payment method radio list.
- `src/components/checkout/PaymentProviderPicker.tsx` — provider radio list.

### Backend files

- `FF Projects/temuclearance/firebase/functions/paystack_initialize.js`
- `FF Projects/temuclearance/firebase/functions/paystack_verify.js`
- `FF Projects/temuclearance/firebase/functions/paystack_webhook.js`
- `FF Projects/temuclearance/firebase/functions/lib/paymentChannels.js` — shared channel normalization.
- `FF Projects/temuclearance/firebase/functions/lib/orderFulfillment.js` — shared Make.com payload + idempotent order fulfillment.

### Inline checkout

After calling `paystackInitialize`, the frontend receives `accessCode` and opens the Paystack popup via `PaystackPop.resumeTransaction(...)`. The redirect/callback URL is also passed to Paystack for customers who complete payment in a redirected flow.

---

## 5. KoraPay integration

### Frontend files

- `src/services/korapay.ts` — wrappers around `korapayInitialize` and `korapayVerify` callable functions.
- `src/services/payments.ts` — provider routing.
- `src/pages/PaymentPage.tsx` — redirects to KoraPay's hosted checkout.

### Backend files

- `FF Projects/temuclearance/firebase/functions/korapay_initialize.js`
- `FF Projects/temuclearance/firebase/functions/korapay_verify.js`
- `FF Projects/temuclearance/firebase/functions/korapay_webhook.js`
- Shared helpers in `lib/`.

### Redirect checkout

`korapayInitialize` calls `POST /merchant/api/v1/charges/initialize` and returns `data.checkout_url`. The frontend redirects the browser to that URL. KoraPay returns the customer to:

```
https://www.temupromo.shop/payment?ref=<orderId>&provider=korapay&reference=<koraPayReference>
```

The Payment page then calls `korapayVerify(reference)`.

### Webhook

KoraPay sends `charge.success` to the webhook URL. The signature in `x-korapay-signature` is verified against the `data` object only, using HMAC SHA256 and the secret key.

---

## 6. Backend configuration

### Environment variables

Frontend / Vercel:

```ini
VITE_ENABLE_PAYSTACK_PAYMENT=true
VITE_ENABLE_KORAPAY_PAYMENT=true
VITE_PAYMENT_METHODS=["card","bank_transfer"]
```

Backend / Firebase Functions:

```ini
PAYSTACK_SECRET_KEY=<backend-only secret>
KORAPAY_SECRET_KEY=<backend-only secret>
ENABLE_PAYSTACK_PAYMENT=true   # optional; defaults to true
ENABLE_KORAPAY_PAYMENT=true    # optional; defaults to true
```

Secrets are never exposed to the browser. They are stored in the backend workspace:

```
FF Projects/temuclearance/firebase/functions/.env
```

That file is gitignored and must not be committed.

### Deploy functions

```powershell
firebase deploy --only functions --project temu-r-b-b-t-tn1fc3
```

### Webhook URLs

Configure these in the respective provider dashboards:

- **Paystack**: `https://us-central1-temu-r-b-b-t-tn1fc3.cloudfunctions.net/paystackWebhook`
- **KoraPay**: `https://us-central1-temu-r-b-b-t-tn1fc3.cloudfunctions.net/korapayWebhook`

For KoraPay, enter the webhook URL under **Dashboard → Settings → API Configuration → Notification URLs**.

The Paystack callback URL should be:

```
https://www.temupromo.shop/payment
```

The initialize functions also pass a per-order `callback_url`/`redirect_url`, which the gateway prefers when provided.

---

## 7. Switching Paystack between test and live

Only the secret key changes. The API endpoint (`https://api.paystack.co`) and frontend code stay the same.

1. Update the backend `.env`:
   ```
   PAYSTACK_SECRET_KEY=sk_live_...
   ```
2. Redeploy:
   ```powershell
   firebase deploy --only functions --project temu-r-b-b-t-tn1fc3
   ```
3. No Vercel rebuild is required.

---

## 8. Switching KoraPay between test and live

1. Update the backend `.env`:
   ```
   KORAPAY_SECRET_KEY=sk_live_...
   ```
2. Redeploy:
   ```powershell
   firebase deploy --only functions --project temu-r-b-b-t-tn1fc3
   ```
3. No Vercel rebuild is required.

The supplied key is a test secret; keep it until you are ready to go live.

---

## 9. Webhook idempotency

Both webhooks follow the same idempotent pattern:

1. Verify the signature.
2. Re-verify the transaction server-side.
3. Look up the order by `paymentReference`.
4. If `paymentStatus` is already `Paid` and `purchaseMailSent` is `true`, return `200` immediately.
5. Otherwise update `paymentStatus` to `Paid`, send the Make.com confirmation, and set `purchaseMailSent: true`.

Duplicate notifications do not send multiple emails or create duplicate side effects.

---

## 10. Make.com notification

Both providers send the same payload shape to the Make.com webhook:

- `email_to`
- `name`
- `subject`
- `total_amount`
- `order_id`
- `shipping_address`
- `product_name`
- `order_date`
- `expected_delivery`
- `phone`
- `payment_provider` — `"paystack"` or `"korapay"`

No existing fields are renamed or removed.

---

## 11. Expected delivery

When an order is created, `CheckoutPage` calculates an expected delivery date from the selected delivery option and stores it as `expected_delivery` on the Firestore order document.

- **Standard**: 9 days after the order creation date (matches the `4–9` day delivery window shown to the customer).
- **Express**: 4 days after the order creation date (matches the `2–4` day delivery window).

The stored value is a Firestore `Timestamp`. It is formatted as a human-readable string (e.g. `"August 28, 2026"`) when building the Make.com webhook payload.

Both Paystack and KoraPay webhooks include `expected_delivery` in the Make.com payload. Existing orders without the field fall back to an empty string.

## 12. Testing

### Local / smoke

With both online providers disabled, the smoke test runs checkout with pay-on-delivery and local simulation.

### Production Paystack

1. Enable `VITE_ENABLE_PAYSTACK_PAYMENT=true` in Vercel.
2. Ensure `PAYSTACK_SECRET_KEY` is set in the backend.
3. Place an order and select Paystack.
4. Complete the popup / redirect flow.
5. Confirm the order shows `paymentStatus: Paid` and the Make.com webhook fires.

### Production KoraPay

1. Enable `VITE_ENABLE_KORAPAY_PAYMENT=true` in Vercel.
2. Ensure `KORAPAY_SECRET_KEY` is set in the backend.
3. Configure the KoraPay webhook URL in the dashboard.
4. Place an order and select KoraPay.
5. Complete payment on the KoraPay hosted page.
6. Confirm redirect verification or webhook updates the order to `Paid`.

---

## 12. Important security notes

- Never place `PAYSTACK_SECRET_KEY` or `KORAPAY_SECRET_KEY` in React code, Vercel frontend env vars, `localStorage`, Firestore, or GitHub.
- Both webhook handlers reject requests with invalid signatures before doing anything else.
- The backend verifies every transaction amount and currency against the Firestore order before marking it paid.
