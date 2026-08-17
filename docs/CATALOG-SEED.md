# Catalog Seeding Experiment

This document describes the catalog-seeding pipeline added under `catalog-seed/`.
The original goal was to evaluate whether Temu public product pages could be
used as a source of product photography and structured data.  Temu blocked
automated access with a login wall, so the current sample uses the public
**DummyJSON** API as a permitted fallback to prove the pipeline.

## What changed in the app

- New `visible?: boolean` field on `ProductDocument` / `Product`.
- `fetchCatalogue()` now filters out documents where `visible === false` in
  addition to the existing `display !== false` check.
- Missing `visible` is treated as `true` for backward compatibility.

## Pipeline layout

```
catalog-seed/
  config.mjs              # source, category mapping, quality rules, pricing
  README.md               # quick-start
  raw/dummyjson/          # raw source responses
  staging/                # normalized products + audit report
  audit/                  # existing-product report + image audit
  scripts/
    collect.mjs           # fetch raw records from the configured source
    normalize.mjs         # transform, filter, dedup, validate
    import.mjs            # Firestore dry-run / import
    identify-existing.mjs # list current Firestore products
    image-audit.mjs       # HEAD-check every staged image URL
```

## Run the pipeline

```bash
# 1. Collect raw records
node catalog-seed/scripts/collect.mjs

# 2. Normalize / filter / dedup / validate
node catalog-seed/scripts/normalize.mjs

# 3. Audit staged image URLs (HEAD only)
node catalog-seed/scripts/image-audit.mjs

# 4. Dry-run against Firestore (no writes)
node --env-file=.env.local catalog-seed/scripts/import.mjs

# 5. Identify existing dummyJSON/test products
node --env-file=.env.local catalog-seed/scripts/identify-existing.mjs
```

Import (requires service-account credentials):

```bash
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
node catalog-seed/scripts/import.mjs --import --projectId=temu-r-b-b-t-tn1fc3
```

## Temu access result

- Direct HTTP fetch returns a generic SSR shell, not structured product data.
- A Playwright headless browser is redirected to `/login` and product data does
  not hydrate.
- No CAPTCHA solving, credential theft, or anti-bot bypass was attempted.
- Conclusion: **Temu public product pages are not accessible for automated
  extraction under this experiment's constraints.**

## Current sample results (DummyJSON fallback)

| Metric                 | Count |
|------------------------|------:|
| Raw products fetched   |   167 |
| Accepted after filters |   163 |
| Rejected               |     0 |
| Invalid                |     0 |
| Staged image URLs      |   442 |
| Failed image URLs      |     0 |

Categories:

- Electronics: 38
- Home & Kitchen: 40
- Fashion: 20
- Sports & Outdoors: 17
- Jewelry & Accessories: 14
- Beauty: 13
- Shoes: 10
- Automotive: 10
- Bags: 5

## Pricing transformation

`config.mjs` exposes two knobs:

- `SEED_USD_TO_NGN` (default 1500)
- `SEED_PRICE_MARKUP_PERCENT` (default 30)

For each source record:

```
salePriceUSD = sourcePrice * (1 - sourceDiscount / 100)
ourPriceNGN  = roundTo10(salePriceUSD * SEED_USD_TO_NGN * (1 + markup/100))
```

Prices are explicitly provisional seed values.

## Visibility and safety

- New seeded products are written with `visible: true`.
- The archive script (`import.mjs --archive-dummyjson --execute`) hides existing
  legacy products by setting `display: false` and `visible: false`.  It does not
  delete documents unless a separate deletion script is added.
- The import script skips existing document IDs unless `--overwrite` is passed.

## Source substitution

To use a different permitted source:

1. Update `SOURCE` and `CATEGORY_MAP` in `catalog-seed/config.mjs`.
2. Add a normalizer branch in `catalog-seed/scripts/normalize.mjs`.
3. Re-run `collect.mjs` and `normalize.mjs`.
