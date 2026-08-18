/**
 * Call the one-time migrateCatalog Cloud Function to delete the 27 bad products
 * and reprice the remaining catalog.
 *
 * Reads the document IDs from catalog-seed/audit/existing-dummyjson-products.json.
 */
import { readFile } from "node:fs/promises";

const auditPath = new URL("../catalog-seed/audit/existing-dummyjson-products.json", import.meta.url);
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const deleteIds = audit.products.filter((p) => p.likelyInappropriate).map((p) => p.id);

const secret = "16f89fb909ed9289e7aa97ac8e7ceb0b1520069983411a15aac08adba227b064";
const url = "https://us-central1-temu-r-b-b-t-tn1fc3.cloudfunctions.net/migrateCatalog";

console.log(`Calling migration to delete ${deleteIds.length} products and reprice remaining...`);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret, deleteIds, reprice: true }),
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
