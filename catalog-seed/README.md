# Catalog Seeding Experiment

This directory contains a source-agnostic catalog seeding pipeline.  The
original goal was to evaluate whether Temu public product pages could be used
as a source of product photography and structured data.  That route is blocked
by a login wall / anti-automation protections, so the current sample uses the
public **DummyJSON** API as a permitted fallback to validate the pipeline.

## Directory layout

```
catalog-seed/
  config.mjs                 # source, category mapping, pricing, quality rules
  README.md                  # this file
  raw/                       # raw source responses (do not commit large dumps)
  staging/                   # normalized, validated products ready for review
  audit/                     # reports on existing products, image sources, dry-runs
  scripts/
    collect.mjs              # fetch raw records from the configured source
    normalize.mjs            # transform to store schema + filter + dedup + validate
    import.mjs               # dry-run or import into Firestore
    identify-existing.mjs    # list current Firestore products and flag inappropriate items
```

## Quick start

```bash
# 1. Collect raw source records
node catalog-seed/scripts/collect.mjs

# 2. Normalize / filter / dedup / validate
node catalog-seed/scripts/normalize.mjs

# 3. Dry-run against Firestore (no writes)
node --env-file=.env.local catalog-seed/scripts/import.mjs

# 4. (Optional) Identify existing dummyJSON/test products
node --env-file=.env.local catalog-seed/scripts/identify-existing.mjs
```

## Temu access result

- Direct HTTP fetch returns a generic SSR shell, not structured product data.
- Playwright headless browser is redirected to `/login` and product data never
  hydrates.
- No CAPTCHA solving or credential theft was attempted.
- Conclusion: **Temu public product pages are not accessible for automated
  extraction under this experiment's constraints.**  The pipeline is ready for
  another permitted source.

## Configuration

Environment variables for pricing:

```bash
SEED_USD_TO_NGN=1500
SEED_PRICE_MARKUP_PERCENT=30
```

Category mapping and rejected keywords live in `config.mjs`.

## Source substitution

To swap DummyJSON for another source:

1. Update `SOURCE` in `config.mjs`.
2. Add a source-specific normalizer in `scripts/normalize.mjs` (currently only
   DummyJSON is implemented).
3. Re-run `collect.mjs` and `normalize.mjs`.

## Safety rules

- `import.mjs` defaults to `--dry-run`.
- `--import` requires `GOOGLE_APPLICATION_CREDENTIALS`.
- `--archive-dummyjson --execute` hides existing products (sets `display:false`
  and `visible:false`), it does **not** delete documents unless a future script
  is explicitly added.
