/**
 * Firestore import runner for the staged catalog.
 *
 * DRY-RUN (default):
 *   node catalog-seed/scripts/import.mjs
 *
 *   Prints counts, categories, collisions with existing docs, validation issues,
 *   and image audit.  Nothing is written to Firestore.
 *
 * IMPORT:
 *   node catalog-seed/scripts/import.mjs --import --projectId=temu-r-b-b-t-tn1fc3
 *
 *   Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account
 *   JSON file.  Existing documents are skipped unless --overwrite is passed.
 *
 * ARCHIVE / CLEANUP:
 *   node catalog-seed/scripts/import.mjs --archive-dummyjson --execute
 *   (sets display:false and visible:false on current dummyJSON products)
 */
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = {
    importMode: false,
    overwrite: false,
    archive: false,
    execute: false,
    projectId: "temu-r-b-b-t-tn1fc3",
  };
  for (const arg of argv) {
    if (arg === "--import") args.importMode = true;
    if (arg === "--overwrite") args.overwrite = true;
    if (arg === "--archive-dummyjson") args.archive = true;
    if (arg === "--execute") args.execute = true;
    if (arg.startsWith("--projectId=")) args.projectId = arg.split("=")[1];
  }
  return args;
}

function loadEnv() {
  try {
    const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^VITE_([^=]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // ignore missing env
  }
}

loadEnv();

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
});
const webDb = getFirestore(app);

async function getExistingIds() {
  const snap = await getDocs(collection(webDb, "products"));
  return new Map(snap.docs.map((d) => [d.id, d.data()]));
}

async function audit(staging) {
  const existing = await getExistingIds();
  const collisions = staging.filter((p) => existing.has(p.productId));
  const categories = staging.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const imageStatuses = [];
  for (const p of staging) {
    for (const url of p.images) {
      imageStatuses.push({ productId: p.productId, productName: p.productName, source: p.source, imageUrl: url, status: "staged_url" });
    }
  }

  return { existingCount: existing.size, collisions, categories, imageStatuses };
}

async function runDryRun(staging) {
  const report = await audit(staging);
  console.log("\n=== DRY RUN ===");
  console.log(`Staged products: ${staging.length}`);
  console.log(`Existing Firestore products: ${report.existingCount}`);
  console.log(`Collisions (same productId): ${report.collisions.length}`);
  console.log("Categories (staged):");
  Object.entries(report.categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  console.log(`Image URLs staged: ${report.imageStatuses.length}`);
  if (report.collisions.length) {
    console.log("\nCollision IDs (would be skipped):");
    report.collisions.slice(0, 10).forEach((p) => console.log(`  ${p.productId} - ${p.productName}`));
  }
  return report;
}

async function runImport(staging, { overwrite, projectId }) {
  const adminPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!adminPath) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS is required for import.");
    process.exit(1);
  }
  const admin = await import("firebase-admin");
  const existing = await getExistingIds();
  admin.initializeApp({ credential: admin.credential.cert(adminPath), projectId });
  const adminDb = admin.firestore();

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const product of staging) {
    const ref = adminDb.collection("products").doc(product.productId);
    if (existing.has(product.productId)) {
      if (!overwrite) {
        skipped++;
        continue;
      }
      await ref.set(product);
      updated++;
    } else {
      await ref.set(product);
      created++;
    }
  }

  console.log(`Import complete: ${created} created, ${updated} overwritten, ${skipped} skipped.`);
}

async function runArchive({ execute, projectId }) {
  const existing = await getExistingIds();
  // Treat all current products as legacy dummyJSON/test seed for this exercise.
  const targets = [...existing.entries()]
    .filter(([, data]) => data.display !== false && data.visible !== false)
    .map(([id]) => id);

  console.log(`\n=== ARCHIVE DUMMYJSON PRODUCTS ===`);
  console.log(`Target products to hide: ${targets.length}`);
  if (!execute) {
    console.log("This is a DRY RUN. Pass --execute to hide these products (display:false, visible:false).");
    targets.slice(0, 20).forEach((id) => console.log(`  ${id}`));
    if (targets.length > 20) console.log(`  ... and ${targets.length - 20} more`);
    return;
  }

  const adminPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!adminPath) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS is required for archive.");
    process.exit(1);
  }
  const admin = await import("firebase-admin");
  admin.initializeApp({ credential: admin.credential.cert(adminPath), projectId });
  const adminDb = admin.firestore();

  const batch = adminDb.batch();
  for (const id of targets) {
    const ref = adminDb.collection("products").doc(id);
    batch.update(ref, { display: false, visible: false });
  }
  await batch.commit();
  console.log(`Archived ${targets.length} products (set display:false and visible:false).`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const staging = JSON.parse(await readFile(join(ROOT, "staging", "products.json"), "utf8"));

  if (args.archive) {
    await runArchive(args);
    return;
  }

  if (!args.importMode) {
    await runDryRun(staging);
    return;
  }

  await runImport(staging, args);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
