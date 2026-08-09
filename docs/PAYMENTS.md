# Payments

Payments support two modes:

1. **Paystack** for card, bank-transfer and USSD.
2. **Pay-on-delivery** (local simulation) for cash/card at the door.

---

## 1. Frontend flow

```
CheckoutPage
  └─ user picks payment method ──> createOrder in Firestore
                                   paymentMethod = "CARD" | "TRANSFER" | "USSD" | "POD"
PaymentPage
  ├─ method = POD           => local simulation => "pending"
  ├─ Paystack enabled       => paystackInitialize => PaystackPop.resumeTransaction(accessCode)
  └─ Paystack not enabled   => local simulation => "paid"
        (this keeps local/smoke tests green while the functions are not deployed)
Paystack inline callbacks
  └─ onSuccess(reference) => paystackVerify(reference) => "paid" | "pending" | "failed"
Paystack redirect fallback
  └─ /payment?ref=...&reference=... or trxref=...
       => paystackVerify(reference) => "paid" | "pending" | "failed"
Paystack webhook
  └─ existing paystackWebhook confirms payment independently and idempotently
```

---

## 2. Paystack integration

### Files

- `src/services/paystack.ts` — wrappers around `paystackInitialize` and `paystackVerify` callable functions.
- `src/services/payments.ts` — `paymentProvider` seam; re-exports the Paystack helpers.
- `src/pages/PaymentPage.tsx` — orchestrates initializing, redirecting, verifying and result UIs.
- `FF Projects/temuclearance/firebase/functions/paystack_initialize.js`
- `FF Projects/temuclearance/firebase/functions/paystack_verify.js`

### Inline checkout

The frontend now uses Paystack's official InlineJS Popup V2. After calling
`paystackInitialize` it receives `accessCode` and calls
`PaystackPop.resumeTransaction(accessCode, { onSuccess, onCancel, onError, onLoad })`.
The customer stays on the Payment route inside a popup, then the frontend calls
`paystackVerify(reference)` server-side before marking the order paid.

The redirect/callback URL is still passed to Paystack as a fallback for customers
who complete payment in a redirected flow.

### Enabling Paystack in development

By default, the production build calls the Cloud Functions. Development (`npm run dev`)
falls back to local simulation unless you opt in:

```ini
# .env.local
VITE_PAYSTACK_ENABLED=true
```

When `VITE_PAYSTACK_ENABLED=true` the frontend calls the real `paystackInitialize`
function and opens Paystack's checkout popup; on `onSuccess` it calls `paystackVerify`.

### Environment flags

```ts
// src/services/paystack.ts
export const isPaystackEnabled =
  import.meta.env.VITE_PAYSTACK_ENABLED === "true" ||
  (import.meta.env.VITE_PAYSTACK_ENABLED !== "false" && import.meta.env.PROD);
```

`VITE_FIREBASE_FUNCTIONS_REGION` is optional and defaults to `us-central1`.

---

## 3. Backend details

### `paystackInitialize`

- Validates the order:
  - `paymentMethod` is one of `CARD`, `TRANSFER`, `BANK-TRANSFER`, `USSD`, `PAYSTACK`, `NOW`.
  - `paymentStatus` is not already `Paid`.
  - `totalPrice` is a positive number.
  - `address.email` is present.
- Computes the trusted amount in **kobo** (`NGN * 100`).
- Uses the **order id** as the Paystack `reference` so the existing webhook can
  find the order by `paymentReference`.
- Calls `https://api.paystack.co/transaction/initialize` with `callback_url`.
- Writes a `payments/{paymentId}` document and updates the order with
  `paymentGateway`, `paymentReference`, `paymentStatus: "processing"`.

### `paystackVerify`

- Calls `https://api.paystack.co/transaction/verify/{reference}`.
- If status is not `success`, returns `failed` to the frontend.
- If successful, validates the paid amount matches the order and currency is `NGN`.
- Updates the order `paymentStatus: "Paid"` and `paidAt` idempotently.
- Returns `status: "paid"`.

### `paystackWebhook`

- Existing HTTP function triggered by Paystack `charge.success`.
- Verifies the Paystack signature, calls Paystack verify, locates the order by
  `paymentReference`, updates `paymentStatus: "Paid"` and sends a confirmation to
  Make.com.
- It does **not** validate amount; `paystackVerify` is the stricter path used by
  the frontend.

---

## 4. Configuration

1. Set the Paystack secret:
   ```powershell
   firebase functions:secrets:set PAYSTACK_SECRET_KEY --project temu-r-b-b-t-tn1fc3
   ```
2. Deploy the functions:
   ```powershell
   firebase deploy --only functions --project temu-r-b-b-t-tn1fc3
   ```
3. Configure the Paystack callback URL on the Paystack dashboard to:
   ```
   https://temu-r-b-b-t-tn1fc3.web.app/payment
   ```
   The initialize function also passes a per-order `callback_url`, which Paystack
   uses when provided.

---

## 5. Testing

- With `VITE_PAYSTACK_ENABLED=false` (or unset in dev), the smoke test runs the
  full checkout with local simulation and passes.
- With `VITE_PAYSTACK_ENABLED=true`, the user is redirected to Paystack and the
  callback is verified.
- Use Paystack test keys (`sk_test_...`) while validating; the functions store
  the key as a Firebase secret.
