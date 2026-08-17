/**
 * Normalize raw source records into the store product schema, apply quality
 * filters, deduplicate, validate, and write the staging dataset.
 *
 * Run: node catalog-seed/scripts/normalize.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOURCE,
  CATEGORY_MAP,
  EXCLUDED_CATEGORIES,
  REJECTED_KEYWORDS,
  REQUIRED_FIELDS,
  DEFAULT_USD_TO_NGN,
  DEFAULT_MARKUP_PERCENT,
} from "../config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "raw", SOURCE.name);
const STAGING_DIR = join(ROOT, "staging");

const usdToNgn = Number(process.env.SEED_USD_TO_NGN ?? DEFAULT_USD_TO_NGN);
const markupPercent = Number(process.env.SEED_PRICE_MARKUP_PERCENT ?? DEFAULT_MARKUP_PERCENT);

function stableId(seed) {
  const hex = createHash("sha256").update(String(seed)).digest("hex");
  const n = Number.parseInt(hex.slice(0, 12), 16) % 1_000_000_000;
  return `PRD-TEMU-${String(n).padStart(9, "0")}`;
}

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transformPrice(sourcePrice, sourceDiscount) {
  const discountedUsd = Number(sourcePrice) * (1 - Number(sourceDiscount || 0) / 100);
  const converted = discountedUsd * usdToNgn;
  const marked = converted * (1 + markupPercent / 100);
  // Round to nearest 10 NGN for a realistic storefront look.
  return Math.round(Math.max(marked, 0) / 10) * 10;
}

function splitDescription(text) {
  if (!text) return [];
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function buildWhatsInTheBox(title) {
  return [`1 x ${title.trim()}`, "Packaging box", "User manual / care guide"];
}

function mapReviews(reviews = []) {
  return reviews.slice(0, 5).map((r, i) => ({
    customerName: r.reviewerName || r.customerName || `Reviewer ${i + 1}`,
    title: r.title || undefined,
    comment: (r.comment || r.reviewText || "").trim(),
    rating: Math.max(0, Math.min(Number(r.rating) || 0, 5)),
    verifiedPurchase: true,
    created_at: r.date || r.created_at || new Date().toISOString(),
  }));
}

function containsRejectedKeyword(text) {
  const normalized = normalizeText(text);
  return REJECTED_KEYWORDS.some((kw) => {
    // Match whole words only, e.g. "drink" should not reject "drinkware".
    const re = new RegExp(`(?:^|[^a-z0-9])${kw}(?:$|[^a-z0-9])`, "i");
    return re.test(` ${normalized} `);
  });
}

function normalizeDummyJsonProduct(raw) {
  const mapping = CATEGORY_MAP[raw.category];
  if (!mapping) return null;

  const productName = String(raw.title || "").trim();
  if (!productName) return null;

  const sourceUrl = `${SOURCE.baseUrl}/products/${raw.id}`;
  const id = stableId(`${SOURCE.name}:${raw.id}:${productName}`);

  const price = transformPrice(raw.price, raw.discountPercentage);
  const discountPercent = Math.round(Number(raw.discountPercentage || 0));
  const images = Array.isArray(raw.images) && raw.images.length ? raw.images : raw.thumbnail ? [raw.thumbnail] : [];

  return {
    productId: id,
    productName,
    brandName: raw.brand || undefined,
    category: mapping.category,
    subCategory: mapping.subCategory,
    productType: Array.isArray(raw.tags) && raw.tags[0] ? raw.tags[0] : undefined,
    productDetails: String(raw.description || "").trim() || undefined,
    description: splitDescription(raw.description),
    whatsInTheBox: buildWhatsInTheBox(productName),
    tags: [...new Set([
      ...(raw.tags || []),
      mapping.category,
      mapping.subCategory,
      raw.brand,
    ].filter(Boolean))].map((t) => String(t).toLowerCase().trim()),
    promotionalTags: [],
    images,
    descriptionImgs: [],
    price,
    discountPercent,
    ratings: Number(raw.rating) || 0,
    soldQuantity: 0,
    totalStock: Number(raw.stock) || 0,
    availableStock: Number(raw.stock) || 0,
    sponsored: false,
    harmful: false,
    display: true,
    visible: true,
    productReviewsList: mapReviews(raw.reviews),
    source: SOURCE.name,
    sourceUrl,
    retrievedAt: new Date().toISOString(),
  };
}

function validate(product) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (product[field] === undefined || product[field] === null || product[field] === "") {
      errors.push(`missing ${field}`);
    }
  }
  if (!Array.isArray(product.images) || product.images.length === 0) {
    errors.push("no images");
  }
  if (typeof product.price !== "number" || product.price <= 0) {
    errors.push("invalid price");
  }
  if (typeof product.availableStock !== "number" || product.availableStock < 0) {
    errors.push("invalid stock");
  }
  return errors;
}

async function main() {
  await mkdir(STAGING_DIR, { recursive: true });

  const files = (await readdir(RAW_DIR)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  console.log(`Normalizing ${files.length} raw files...`);

  const all = [];
  const rejected = [];
  const invalid = [];
  const seen = new Map();
  const idMap = new Map();

  for (const file of files) {
    const raw = JSON.parse(await readFile(join(RAW_DIR, file), "utf8"));
    const products = raw.products || [];
    const slug = file.replace(".json", "");

    if (EXCLUDED_CATEGORIES.includes(slug)) {
      console.log(`  skipping excluded category: ${slug}`);
      continue;
    }

    for (const p of products) {
      const normalized = normalizeDummyJsonProduct(p);
      if (!normalized) {
        invalid.push({ sourceId: p.id, reason: "no category mapping or missing name" });
        continue;
      }

      const nameKey = normalizeText(normalized.productName);
      const dupKey = `${nameKey}|${normalized.sourceUrl}`;
      if (seen.has(dupKey)) {
        rejected.push({ id: normalized.productId, name: normalized.productName, reason: "duplicate" });
        continue;
      }
      seen.set(dupKey, normalized.productId);

      if (
        containsRejectedKeyword(normalized.productName) ||
        containsRejectedKeyword(normalized.category)
      ) {
        rejected.push({ id: normalized.productId, name: normalized.productName, reason: "rejected keyword" });
        continue;
      }

      const errors = validate(normalized);
      if (errors.length) {
        invalid.push({ id: normalized.productId, name: normalized.productName, reasons: errors });
        continue;
      }

      // Stable ID collision resolution
      let finalId = normalized.productId;
      let collisionCount = 0;
      while (idMap.has(finalId)) {
        collisionCount++;
        finalId = `${normalized.productId.slice(0, -String(collisionCount).length)}${collisionCount}`;
      }
      normalized.productId = finalId;
      idMap.set(finalId, normalized.productName);

      all.push(normalized);
    }
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    pricing: { usdToNgn, markupPercent },
    stats: {
      accepted: all.length,
      rejected: rejected.length,
      invalid: invalid.length,
      totalProcessed: all.length + rejected.length + invalid.length,
    },
    categories: all.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {}),
    rejected,
    invalid,
  };

  await writeFile(join(STAGING_DIR, "products.json"), JSON.stringify(all, null, 2));
  await writeFile(join(STAGING_DIR, "audit.json"), JSON.stringify(audit, null, 2));

  console.log(`Accepted: ${audit.stats.accepted}`);
  console.log(`Rejected: ${audit.stats.rejected}`);
  console.log(`Invalid: ${audit.stats.invalid}`);
  console.log("Categories:");
  Object.entries(audit.categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  console.log(`Wrote staging/products.json and staging/audit.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
