/**
 * Inspect the existing Firestore products collection for catalog seeding prep.
 * Run: node --env-file=.env.local scripts/inspect-catalog.mjs
 */
import { initializeApp } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const productsSnap = await getDocs(collection(db, "products"));
const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

const outDir = `${__dirname}/../catalog-seed/audit`;
mkdirSync(outDir, { recursive: true });

const fields = new Set();
const categories = {};
let withImages = 0;
let withPrice = 0;
let withDiscount = 0;
let withStock = 0;

const simplified = products.map((p) => {
  Object.keys(p).forEach((k) => fields.add(k));
  const cat = p.category || "(none)";
  categories[cat] = (categories[cat] || 0) + 1;
  if (Array.isArray(p.images) && p.images.length) withImages++;
  if (typeof p.price === "number") withPrice++;
  if (typeof p.discountPercent === "number") withDiscount++;
  if (typeof p.availableStock === "number" || typeof p.totalStock === "number") withStock++;
  return {
    id: p.id,
    productId: p.productId,
    productName: p.productName,
    category: p.category,
    subCategory: p.subCategory,
    price: p.price,
    discountPercent: p.discountPercent,
    availableStock: p.availableStock,
    totalStock: p.totalStock,
    imagesCount: Array.isArray(p.images) ? p.images.length : 0,
    brandName: p.brandName,
    tags: p.tags,
    promotionalTags: p.promotionalTags,
    sponsored: p.sponsored,
    display: p.display,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  totalProducts: products.length,
  visibleProducts: products.filter((p) => p.display !== false).length,
  fieldsPresent: [...fields].sort(),
  categories,
  stats: { withImages, withPrice, withDiscount, withStock },
  products: simplified,
};

const outPath = `${outDir}/existing-products.json`;
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Total: ${report.totalProducts}, categories: ${Object.keys(categories).length}`);
console.log("Category counts:");
Object.entries(categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
process.exit(0);
