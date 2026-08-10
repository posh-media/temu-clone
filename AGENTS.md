# Agent Notes

Context for future work on this Temu clone.

---

## Build & verify

```powershell
npm run build
npm run lint
node scripts/smoke-flow.mjs http://localhost:<port>
```

- `build` runs `tsc -b` then `vite build`.
- `lint` runs `oxlint` and reports warnings.
- `smoke-flow.mjs` exercises desktop + mobile flows end-to-end.

---

## Dev server

```powershell
npm run dev
```

The dev server may bind to the next free port if 5173 is in use. The current
preview is on `http://localhost:5177`.

---

## Project-specific notes

- **Data router**: the app uses `react-router-dom` v7's `createBrowserRouter`.
  `useBlocker` works for flash-sale navigation guards; this requires the data
  router context.
- **Paystack feature flag**: set `VITE_PAYSTACK_ENABLED=true` in `.env.local`
  to call the real Cloud Functions during development. Without the flag (or in
  production builds where it is not explicitly disabled), the frontend falls
  back to local simulation and the smoke test passes.
- **Firebase project**: connected to `temu-r-b-b-t-tn1fc3` in `us-central1`.
  Cloud Functions live in the separate `FF Projects/temuclearance/firebase/`
  workspace.
- **Smoke test resilience**: visible elements (`:visible`) are used for mobile
  and desktop variants. Firestore listener aborts are ignored.
- **SPA rewrites**: `vercel.json` at the repo root rewrites all non-file
  routes to `index.html` so deep links like `/product/:id`, `/orders/:id`,
  `/signup`, `/login` work on Vercel. Do not remove or edit the regex without
  verifying static assets still serve.
- **Flash-sale configuration**: controlled by `VITE_FLASH_SALE_DURATION_SECONDS`
  (default 600) and `VITE_FLASH_SALE_RESTART_ON_TIMEOUT` (default false). These
  are build-time values; redeploy after changing them on Vercel.
- **Order canonical ID**: the canonical document/URL ID is `ORD-TEMU-<random 9
  digits>` (e.g. `ORD-TEMU-561676945`). The UI and routes use `order.id`, while
  `paymentReference` keeps the Paystack transaction reference.
- **Docs**: implementation details are in `docs/ARCHITECTURE.md`,
  `docs/FIREBASE.md`, `docs/PAYMENTS.md`, `docs/FLASH-SALE.md` and
  `docs/LEARNING-NOTES.md`.
