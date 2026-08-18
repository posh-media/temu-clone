# Catalog Seeding Experiment

This document describes the catalog-seeding pipeline under `catalog-seed/`, the
cleanup/reprice of the existing Firestore catalog, and the current source
selection.

## What changed in the app

- New `visible?: boolean` field on `ProductDocument` / `Product`.
- `fetchCatalogue()` filters out documents where `visible === false` in addition
  to the existing `display !== false` check.
- Missing `visible` is treated as `true` for backward compatibility.

## Temu result

Direct HTTP fetches and Playwright both hit a login wall. No anti-bot bypass,
CAPTCHA solving, or credential theft was attempted. Temu is **not used**.

## Existing catalog cleanup

The 27 products flagged as inappropriate/irrelevant in
`catalog-seed/audit/existing-dummyjson-products.json` were permanently deleted
from the `products` collection via a temporary, secret-protected Cloud Function.
All remaining 168 existing products were re-priced into realistic provisional
NGN ranges using category-aware rules in `catalog-seed/pricing.mjs`.

## New product source: Amazon Berkeley Objects (ABO)

The chosen permitted source is the **Amazon Berkeley Objects dataset**, a
`CC BY 4.0` collection of ~148k Amazon product listings with real catalog
images, multilingual metadata, dimensions, materials, and product-type
information.

- **License:** CC BY 4.0 — commercial use allowed with attribution.
- **Attribution:** Amazon.com / Matthieu Guillaumin, Thomas Dideriksen, Kenan
  Deng, Himanshu Arora, Jasmine Collins, Jitendra Malik.
- **Limitations:** ABO does **not** include prices, so new products are given
  provisional NGN prices by category-aware rules. ABO also warns that public
  image URLs may change; for a production store, images should eventually be
  mirrored to your own storage.

## Pipeline layout

```
catalog-seed/
  config.mjs              # DummyJSON/Temu source config + quality rules
  pricing.mjs             # Category-aware NGN pricing rules (used for cleanup + imports)
  README.md
  raw/
    dummyjson/            # earlier DummyJSON raw responses
    abo/products.json     # ABO test-batch raw responses
  staging/
    products.json         # earlier DummyJSON normalized products
    abo-products.json     # ABO normalized products ready for import
    abo-audit.json        # ABO image audit report
  audit/
    existing-dummyjson-products.json
    existing-products.json
  scripts/
    collect.mjs           # DummyJSON collector
    collect-abo.mjs       # ABO test-batch collector
    normalize.mjs         # DummyJSON normalizer
    normalize-abo.mjs    # ABO normalizer + image verifier
    import.mjs            # Firestore dry-run / import (supports --source=abo)
    identify-existing.mjs
    image-audit.mjs
```

## Run the pipeline

```bash
# ABO test batch
node catalog-seed/scripts/collect-abo.mjs
node catalog-seed/scripts/normalize-abo.mjs
node --env-file=.env.local catalog-seed/scripts/import.mjs --source=abo

# Import (requires temporary Cloud Function or service account; see scripts/import-abo.mjs)
node scripts/import-abo.mjs

# Re-price existing products or delete flagged products
# See scripts/execute-migration.mjs and the temporary migrateCatalog Cloud Function.
```

## Current ABO test batch results

| Metric                  | Count |
|-------------------------|------:|
| Raw products fetched    |    30 |
| Accepted after filters  |    30 |
| Rejected                |     0 |
| Image URLs verified     |   155 |
| Failed image URLs       |     0 |
| Imported to Firestore   |    30 |
| Collisions skipped      |     0 |

Categories represented:
Home & Kitchen, Shoes, Phone & Accessories, Electronics, Fashion, Beauty,
Bags, Office & School, Jewelry & Accessories, Computer Accessories,
Sports & Outdoors, Automotive, Tools.

## Pricing methodology

Pricing is configured in `catalog-seed/pricing.mjs` through `CATEGORY_RULES`,
which defines realistic `min`/`max` NGN ranges per store category.

- **Existing products:** the current NGN price is mapped into its category's
  target range while preserving relative value (cheaper items stay cheaper,
  expensive items stay expensive).
- **New ABO products:** ABO has no prices, so each product gets a deterministic
  provisional price within its category range via a stable hash of its source
  ID. This keeps the same product from receiving a different price on every
  run and avoids every product landing on the same price.

Adjust ranges by editing `CATEGORY_RULES` and re-running the relevant script.

## Visibility and safety

- New seeded products are written with `visible: true`.
- The import script skips existing document IDs unless `--overwrite` is passed.
- The cleanup operation permanently deleted only the 27 flagged products; no
  other documents were removed or overwritten.

## Source substitution

To add a different permitted source:

1. Add a collector script under `catalog-seed/scripts/`.
2. Map its categories and excluded terms in a normalizer script.
3. Ensure every new product has `visible: true` and a unique `productId`.
4. Run image verification before staging.
5. Import through the dry-run/import path.
