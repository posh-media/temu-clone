/**
 * Collect raw product records from the configured source.
 *
 * For the current sample run this hits the DummyJSON public API, because the
 * Temu route is blocked by a login wall (see probe output / audit report).
 *
 * Run: node catalog-seed/scripts/collect.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE, EXCLUDED_CATEGORIES, CATEGORY_MAP } from "../config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "raw", SOURCE.name);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const categoryList = await fetchJson(`${SOURCE.baseUrl}/products/categories`);
  const categories = categoryList
    .filter((c) => !EXCLUDED_CATEGORIES.includes(c.slug))
    .filter((c) => CATEGORY_MAP[c.slug]);

  console.log(`Collecting from ${categories.length} categories...`);

  const summary = { source: SOURCE, retrievedAt: new Date().toISOString(), categories: [] };

  for (const { slug, name, url } of categories) {
    const data = await fetchJson(url);
    const products = data.products || [];
    await writeFile(join(RAW_DIR, `${slug}.json`), JSON.stringify(data, null, 2));
    console.log(`  ${slug}: ${products.length} products`);
    summary.categories.push({ slug, name, count: products.length });
  }

  summary.totalProducts = summary.categories.reduce((sum, c) => sum + c.count, 0);
  await writeFile(join(RAW_DIR, "_summary.json"), JSON.stringify(summary, null, 2));
  console.log(`Wrote raw data to ${RAW_DIR} (${summary.totalProducts} products).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
