/**
 * Identify the current Firestore products and flag likely dummyJSON/test items.
 *
 * Run: node --env-file=.env.local catalog-seed/scripts/identify-existing.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { REJECTED_KEYWORDS } from "../config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUDIT_DIR = join(ROOT, "audit");

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

function containsKeyword(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.some((kw) => normalized.includes(kw));
}

async function main() {
  const snap = await getDocs(collection(db, "products"));
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const flagged = products.map((p) => ({
    id: p.id,
    productId: p.productId,
    productName: p.productName,
    category: p.category,
    subCategory: p.subCategory,
    price: p.price,
    imagesCount: Array.isArray(p.images) ? p.images.length : 0,
    display: p.display,
    visible: p.visible,
    likelyInappropriate:
      containsKeyword(p.productName, REJECTED_KEYWORDS) ||
      containsKeyword(p.category, REJECTED_KEYWORDS) ||
      containsKeyword(p.subCategory, REJECTED_KEYWORDS),
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    likelyInappropriate: flagged.filter((p) => p.likelyInappropriate).length,
    products: flagged,
  };

  await mkdir(AUDIT_DIR, { recursive: true });
  await writeFile(join(AUDIT_DIR, "existing-dummyjson-products.json"), JSON.stringify(report, null, 2));

  console.log(`Total existing products: ${report.totalProducts}`);
  console.log(`Likely inappropriate / food / drink items: ${report.likelyInappropriate}`);
  console.log(`Wrote audit/existing-dummyjson-products.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
