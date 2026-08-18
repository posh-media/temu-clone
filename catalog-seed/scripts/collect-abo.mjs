/**
 * Collect a small test batch from the Amazon Berkeley Objects (ABO) dataset.
 *
 * ABO is a CC BY 4.0-licensed dataset of Amazon products with metadata and
 * catalog images.  This script streams one listings file and the image
 * metadata CSV, samples products across relevant store categories, and writes
 * a raw staging file.
 *
 * Run: node catalog-seed/scripts/collect-abo.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "raw", "abo");

const BUCKET = "https://amazon-berkeley-objects.s3.amazonaws.com";
const IMAGE_META_URL = `${BUCKET}/images/metadata/images.csv.gz`;
const LISTING_FILE = `${BUCKET}/listings/metadata/listings_0.json.gz`;

const TARGET_CATEGORIES = [
  "Electronics",
  "Phone & Accessories",
  "Computer Accessories",
  "Fashion",
  "Shoes",
  "Bags",
  "Beauty",
  "Jewelry & Accessories",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Automotive",
  "Tools",
  "Toys & Games",
  "Office & School",
  "Pet Supplies",
  "Kids & Baby",
];

const MAX_PER_CATEGORY = 3;
const TARGET_TOTAL = 30;

const EXCLUDED_KEYWORDS = [
  "grocery", "food", "beverage", "drink", "pantry", "snack", "meat", "seafood",
  "dairy", "bread", "breakfast", "candy", "chocolate", "produce", "vitamin",
  "supplement", "health care", "medical", "household supply", "cleaner",
  "paper", "laundry", "diapering", "feminine care", "first aid", "baby food",
];

function localize(arr, tag = "en_US") {
  if (!Array.isArray(arr) || !arr.length) return undefined;
  const found = arr.find((x) => x?.language_tag === tag);
  return found?.value?.trim() || arr[0]?.value?.trim();
}

function isExcluded(nodeName = "", productType = "") {
  const text = `${nodeName} ${productType}`.toLowerCase();
  return EXCLUDED_KEYWORDS.some((kw) => text.includes(kw));
}

function mapCategory(nodeName = "", productType = "") {
  const lower = nodeName.toLowerCase();
  const pType = (Array.isArray(productType) ? productType[0]?.value : productType)?.toLowerCase() || "";

  if (isExcluded(nodeName, pType)) return null;

  if (lower.includes("shoes") && lower.includes("women")) return "Shoes";
  if (lower.includes("shoes") && lower.includes("men")) return "Shoes";
  if (lower.includes("shoes") && (lower.includes("boys") || lower.includes("girls"))) return "Shoes";
  if (lower.includes("shoes")) return "Shoes";
  if (lower.includes("bags") || lower.includes("luggage")) return "Bags";
  if (lower.includes("jewelry") || lower.includes("watch") || lower.includes("ring") || lower.includes("earrings") || lower.includes("necklace") || lower.includes("bracelet")) return "Jewelry & Accessories";
  if (lower.includes("cell phones") || lower.includes("mobile") || lower.includes("phone") || lower.includes("portable devices")) return "Phone & Accessories";
  if (lower.includes("computers") || lower.includes("laptop") || lower.includes("tablet") || lower.includes("network")) return "Computer Accessories";
  if (lower.includes("electronics") || lower.includes("headphones") || lower.includes("speaker") || lower.includes("camera") || lower.includes("television") || lower.includes("audio") || lower.includes("video") || lower.includes("portable audio")) return "Electronics";
  if (lower.includes("beauty") || lower.includes("skin care") || lower.includes("make-up") || lower.includes("makeup") || lower.includes("hair care") || lower.includes("personal care") || lower.includes("shaving") || lower.includes("oral care")) return "Beauty";
  if (lower.includes("women") || lower.includes("men") || lower.includes("clothing") || lower.includes("fashion") || lower.includes("activewear") || lower.includes("boys") || lower.includes("girls")) return "Fashion";
  if (lower.includes("home & kitchen") || lower.includes("kitchen") || lower.includes("dining") || lower.includes("furniture") || lower.includes("home décor") || lower.includes("bedding") || lower.includes("bath") || lower.includes("home furnishing") || lower.includes("lighting") || lower.includes("home storage") || lower.includes("home improvement")) return "Home & Kitchen";
  if (lower.includes("sports") || lower.includes("fitness") || lower.includes("outdoor recreation") || lower.includes("camping") || lower.includes("golf") || lower.includes("yoga")) return "Sports & Outdoors";
  if (lower.includes("automotive") || lower.includes("car accessories") || lower.includes("oils & fluids") || lower.includes("interior accessories")) return "Automotive";
  if (lower.includes("tools") || lower.includes("hardware") || lower.includes("power & hand")) return "Tools";
  if (lower.includes("toys") || lower.includes("games") || lower.includes("learning")) return "Toys & Games";
  if (lower.includes("office") || lower.includes("school")) return "Office & School";
  if (lower.includes("pet") || lower.includes("cats") || lower.includes("dogs")) return "Pet Supplies";
  if (lower.includes("baby") || lower.includes("kids")) return "Kids & Baby";

  return null;
}

async function fetchGzText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const chunks = [];
    gunzip.on("data", (c) => chunks.push(c));
    gunzip.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    gunzip.on("error", reject);
    Readable.from(buf).pipe(gunzip);
  });
}

async function loadImageMap() {
  const csv = await fetchGzText(IMAGE_META_URL);
  const map = new Map();
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [image_id, height, width, path] = line.split(",");
    if (image_id && path) map.set(image_id, { path, height: Number(height), width: Number(width) });
  }
  return map;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  console.log("Loading ABO image metadata...");
  const imageMap = await loadImageMap();
  console.log(`  ${imageMap.size} images mapped`);

  console.log("Streaming listings...");
  const text = await fetchGzText(LISTING_FILE);
  const lines = text.trim().split("\n");

  const counts = new Map();
  const samples = [];

  for (const line of lines) {
    if (samples.length >= TARGET_TOTAL) break;
    const raw = JSON.parse(line);

    const name = localize(raw.item_name, "en_US");
    if (!name) continue;

    const nodeName = raw.node?.[0]?.node_name || "";
    const productType = raw.product_type?.map((x) => x.value).filter(Boolean).join(",") || "";
    const category = mapCategory(nodeName, productType);
    if (!category || !TARGET_CATEGORIES.includes(category)) continue;

    if (!raw.main_image_id || !imageMap.has(raw.main_image_id)) continue;

    const catCount = counts.get(category) || 0;
    if (catCount >= MAX_PER_CATEGORY) continue;

    samples.push({ ...raw, _abo_category: category });
    counts.set(category, catCount + 1);
  }

  // Build a small image lookup just for the sampled products.
  const usedImageIds = new Set();
  for (const s of samples) {
    usedImageIds.add(s.main_image_id);
    for (const id of s.other_image_id || []) usedImageIds.add(id);
  }
  const usedImageMap = {};
  for (const id of usedImageIds) {
    const meta = imageMap.get(id);
    if (meta) usedImageMap[id] = meta;
  }

  const summary = {
    source: "amazon-berkeley-objects",
    license: "CC BY 4.0",
    attribution: "Amazon.com (Amazon Berkeley Objects dataset)",
    listingFile: LISTING_FILE,
    imageMetaUrl: IMAGE_META_URL,
    collectedAt: new Date().toISOString(),
    total: samples.length,
    counts: Object.fromEntries([...counts.entries()].sort()),
    _imageMap: usedImageMap,
    samples,
  };

  await writeFile(join(RAW_DIR, "products.json"), JSON.stringify(summary, null, 2));
  console.log(`Wrote ${samples.length} ABO samples to ${join(RAW_DIR, "products.json")}`);
  console.log("Category counts:", summary.counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
