/**
 * Import the staged Amazon Berkeley Objects products into Firestore via the
 * temporary importCatalog Cloud Function.
 *
 * Run: node scripts/import-abo.mjs
 */
import { readFile } from "node:fs/promises";

const products = JSON.parse(await readFile("catalog-seed/staging/abo-products.json", "utf8"));
const secret = "4b2cae3fe62b736a75c484fcb6017cb8027a96b4e1adf2fed188a3c9c089e468";
const url = "https://us-central1-temu-r-b-b-t-tn1fc3.cloudfunctions.net/importCatalog";

console.log(`Importing ${products.length} ABO products...`);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret, products, overwrite: true }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log("Status:", res.status);
console.log("Response:", JSON.stringify(body, null, 2));
