/**
 * Audit staged image URLs without downloading the full files.
 *
 * Run: node catalog-seed/scripts/image-audit.mjs
 *
 * Output: catalog-seed/audit/image-audit.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CONCURRENCY = 5;
const TIMEOUT_MS = 10000;

async function fetchHead(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let i = 0;
  async function workerLoop() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, workerLoop));
  return results;
}

async function main() {
  const products = JSON.parse(
    await readFile(join(ROOT, "staging", "products.json"))
  );

  const entries = [];
  const seen = new Set();
  for (const p of products) {
    for (const url of p.images || []) {
      const key = `${p.productId}|${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ productId: p.productId, productName: p.productName, source: p.source, sourceUrl: p.sourceUrl, imageUrl: url });
    }
  }

  console.log(`Auditing ${entries.length} staged image URLs with HEAD requests...`);
  const checks = await runPool(entries, async (entry) => {
    const result = await fetchHead(entry.imageUrl);
    return { ...entry, status: result.status, ok: result.ok, contentType: result.contentType, error: result.error };
  }, CONCURRENCY);

  const ok = checks.filter((c) => c.ok);
  const failed = checks.filter((c) => !c.ok);

  const report = {
    generatedAt: new Date().toISOString(),
    totalImages: checks.length,
    ok: ok.length,
    failed: failed.length,
    uniqueProducts: new Set(checks.map((c) => c.productId)).size,
    checks,
  };

  await mkdir(join(ROOT, "audit"), { recursive: true });
  await writeFile(join(ROOT, "audit", "image-audit.json"), JSON.stringify(report, null, 2));

  console.log(`OK: ${ok.length}, Failed: ${failed.length}`);
  if (failed.length) {
    console.log("Sample failures:");
    failed.slice(0, 5).forEach((f) => console.log(`  ${f.status} ${f.error ?? ""}: ${f.imageUrl}`));
  }
  console.log("Wrote audit/image-audit.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
