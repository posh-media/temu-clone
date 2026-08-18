/**
 * Normalize the raw Amazon Berkeley Objects sample into the store schema,
 * verify image URLs, and write the staging dataset + audit.
 *
 * Run: node catalog-seed/scripts/normalize-abo.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newProductPrice } from "../pricing.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_PATH = join(ROOT, "raw", "abo", "products.json");
const STAGING_DIR = join(ROOT, "staging");

const BUCKET = "https://amazon-berkeley-objects.s3.amazonaws.com";

function stableId(seed) {
  const hex = createHash("sha256").update(String(seed)).digest("hex");
  const n = Number.parseInt(hex.slice(0, 12), 16) % 1_000_000_000;
  return `PRD-ABO-${String(n).padStart(9, "0")}`;
}

function localize(arr, tag = "en_US") {
  if (!Array.isArray(arr) || !arr.length) return undefined;
  const found = arr.find((x) => x?.language_tag === tag);
  return found?.value?.trim() || arr[0]?.value?.trim();
}

function normalizeName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/\b(Amazon[- ]?brand|Amazon-merk|Marca Amazon)\b/gi, "")
    .trim();
}

function toImageUrl(imageMeta) {
  return `${BUCKET}/images/small/${imageMeta.path}`;
}

function buildProduct(raw, imageMap) {
  const category = raw._abo_category;
  const name = normalizeName(localize(raw.item_name, "en_US") || "Untitled product");
  const brand = localize(raw.brand, "en_US") || undefined;
  const productType = raw.product_type?.[0]?.value || undefined;
  const subCategory = raw.node?.[0]?.node_name?.split("/").pop() || productType;

  const bullets = raw.bullet_point
    ?.filter((b) => b.language_tag === "en_US")
    .map((b) => b.value.trim())
    .filter(Boolean) || [];

  const keywords = raw.item_keywords
    ?.filter((k) => k.language_tag === "en_US")
    .map((k) => k.value.trim().toLowerCase())
    .filter(Boolean) || [];

  const tags = [...new Set([...keywords, category, subCategory, brand].filter(Boolean))];

  const imageIds = [raw.main_image_id, ...(raw.other_image_id || [])].filter(Boolean);
  const images = imageIds
    .map((id) => imageMap[id])
    .filter(Boolean)
    .map((meta) => toImageUrl(meta));

  const material = localize(raw.material, "en_US") || undefined;
  const color = localize(raw.color, "en_US") || undefined;
  const dimensions = raw.item_dimensions
    ? Object.entries(raw.item_dimensions)
        .map(([k, v]) => `${k}: ${v.value}${v.unit}`)
        .join(", ")
    : undefined;
  const weight = raw.item_weight?.[0]?.value?.value
    ? `${raw.item_weight[0].value.value} ${raw.item_weight[0].value.unit}`
    : undefined;

  const detailsParts = [material && `Material: ${material}`, color && `Color: ${color}`, dimensions, weight].filter(Boolean);
  const productDetails = bullets.length ? bullets.join(" ") : detailsParts.length ? detailsParts.join(" | ") : undefined;

  const productId = stableId(`abo:${raw.item_id}:${name}`);
  const price = newProductPrice(category, raw.item_id);

  // Derive a plausible stock value from the item id hash so it is stable.
  const stockHash = Number.parseInt(createHash("sha256").update(raw.item_id).digest("hex").slice(0, 8), 16);
  const totalStock = 20 + (stockHash % 480);
  const availableStock = totalStock;

  return {
    productId,
    productName: name,
    brandName: brand,
    category,
    subCategory,
    productType,
    material,
    productDetails,
    description: bullets.length ? bullets : detailsParts,
    whatsInTheBox: [`1 x ${name}`, "Packaging", "Care / user instructions"],
    tags,
    promotionalTags: [],
    images,
    descriptionImgs: [],
    price,
    discountPercent: 0,
    ratings: 0,
    soldQuantity: 0,
    totalStock,
    availableStock,
    sponsored: false,
    harmful: false,
    display: true,
    visible: true,
    source: "amazon-berkeley-objects",
    sourceUrl: `${BUCKET}/index.html`,
    retrievedAt: new Date().toISOString(),
    // Preserve ABO provenance for the audit trail.
    _abo: { item_id: raw.item_id, node: raw.node?.[0]?.node_name, product_type: productType },
  };
}

async function verifyImage(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function main() {
  await mkdir(STAGING_DIR, { recursive: true });

  const raw = JSON.parse(await readFile(RAW_PATH, "utf8"));
  const imageMap = new Map();
  for (const sample of raw.samples) {
    imageMap.set(sample.main_image_id, raw._imageMap?.[sample.main_image_id]);
  }

  // Build image lookup from raw summary if present; otherwise we need the map.
  const summaryImageMap = raw._imageMap || {};

  const products = [];
  const rejected = [];
  for (const sample of raw.samples) {
    const product = buildProduct(sample, summaryImageMap);
    if (product.images.length === 0) {
      rejected.push({ item_id: sample.item_id, name: product.productName, reason: "no resolvable images" });
      continue;
    }
    products.push(product);
  }

  console.log(`Verifying ${products.length} products' images...`);
  const imageAudit = [];
  for (const product of products) {
    for (const url of product.images) {
      const result = await verifyImage(url);
      imageAudit.push({ productId: product.productId, productName: product.productName, imageUrl: url, ...result });
      if (!result.ok) {
        // Remove broken image URLs but keep the product if at least one remains.
        product.images = product.images.filter((u) => u !== url);
      }
    }
  }

  const accepted = products.filter((p) => p.images.length > 0);
  const removedAfterVerify = products.filter((p) => p.images.length === 0);

  const categories = accepted.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const audit = {
    generatedAt: new Date().toISOString(),
    source: raw.source,
    license: raw.license,
    attribution: raw.attribution,
    totalRaw: raw.total,
    accepted: accepted.length,
    rejected: rejected.length,
    removedAfterVerify: removedAfterVerify.length,
    images: {
      total: imageAudit.length,
      ok: imageAudit.filter((i) => i.ok).length,
      failed: imageAudit.filter((i) => !i.ok).length,
    },
    categories,
    imageAudit,
  };

  await writeFile(join(STAGING_DIR, "abo-products.json"), JSON.stringify(accepted, null, 2));
  await writeFile(join(STAGING_DIR, "abo-audit.json"), JSON.stringify(audit, null, 2));

  console.log(`Accepted: ${audit.accepted}`);
  console.log(`Rejected: ${audit.rejected}`);
  console.log(`Removed after verify: ${audit.removedAfterVerify}`);
  console.log(`Images OK: ${audit.images.ok}, Failed: ${audit.images.failed}`);
  console.log("Categories:", categories);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
