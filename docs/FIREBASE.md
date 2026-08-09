# Firebase

The React app connects to the existing Firebase project `temu-r-b-b-t-tn1fc3`.
Firestore collections, Auth and Cloud Functions are all already provisioned.

---

## 1. Project

| Item | Value |
| --- | --- |
| Project id | `temu-r-b-b-t-tn1fc3` |
| Region | `us-central1` |
| Web app | `temu-r-b-b-t-tn1fc3.web.app` |
| Primary database | Cloud Firestore (Native mode) |

The frontend config lives in `.env.local` (git-ignored). Do **not** commit secrets.

---

## 2. Firestore collections

| Collection | Purpose |
| --- | --- |
| `products` | Catalogue: price, stock, images, tags, `promotionalTags`, seller refs |
| `categories` | Top-level and sub-category navigation |
| `sellers` | Seller metadata (mostly used for display names) |
| `orders` | Placed orders, in the existing schema (see `src/services/mappers.ts`) |
| `users` | Auth profile documents created/updated by `src/services/users.ts` |
| `addresses` | Saved shipping addresses for authenticated users |

All writes reuse the document shape discovered during repository inspection so
existing FlutterFlow consumers of the same project are not broken.

---

## 3. Authentication

- Email/password and Google sign-in are supported.
- `AuthProvider` calls `setPersistence(auth, browserLocalPersistence)` so the
  session survives refresh.
- On every sign-in (including Google), `ensureUserProfile` in
  `src/services/users.ts` creates or merges a `users/{uid}` document without
  overwriting existing values with `null`.
- `LoginPage` and `SignupPage` map Firebase error codes to human-readable messages.

---

## 4. Cloud Functions

The backend functions live alongside the existing FlutterFlow project:

```
FF Projects/temuclearance/firebase/functions/
  index.js                 # Exports onUserDeleted, paystackWebhook,
                           # paystackInitialize, paystackVerify
  paystack_webhook.js      # Existing HTTP webhook (charge.success → Firestore)
  paystack_initialize.js   # New onCall: creates a Paystack transaction
  paystack_verify.js       # New onCall: verifies a Paystack reference
```

### `paystackInitialize`

- `onCall` (callable) in `us-central1`.
- Reads the order by `orderId`, validates amount/currency/method, creates a
  `payments/{paymentId}` document and calls `https://api.paystack.co/transaction/initialize`.
- Uses the order id as the Paystack reference so the existing `paystackWebhook`
  can locate the order by `paymentReference`.
- Expects `PAYSTACK_SECRET_KEY` as a Firebase secret or `process.env`.

### `paystackVerify`

- `onCall` (callable) in `us-central1`.
- Calls `https://api.paystack.co/transaction/verify/{reference}`.
- Validates amount/currency, updates `paymentStatus: "Paid"` idempotently,
  and returns the result to the frontend.

### `paystackWebhook`

- Existing `onRequest` HTTP function.
- Handles `charge.success` from Paystack, verifies signature, updates the order.
- **Do not replace or duplicate it.** The new functions complement it.

---

## 5. Deployment

From the backend folder:

```powershell
cd "FF Projects/temuclearance/firebase"
firebase use temu-r-b-b-t-tn1fc3
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase deploy --only functions
```

If you want the React app to call functions from a different checkout, place the
same code under `Temu-Clone-React/functions/`, configure `.firebaserc` and
`firebase.json` there, and deploy from this repo.

---

## 6. Security

- Paystack secret is **only** ever used in Cloud Functions, never in the frontend.
- The frontend uses Firebase Auth identity tokens through `httpsCallable`.
- Order totals are computed server-side from the order document, not supplied by
  the client, to prevent tampering.
