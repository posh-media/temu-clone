/**
 * Tests that VITE_PAYMENT_METHODS filters the checkout payment-method list.
 * This script temporarily overwrites .env.local, rebuilds, and serves the
 * production bundle via `vite preview`, then restores the original env file.
 */
import { spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { chromium } from "playwright";
import { setTimeout as sleep } from "timers/promises";

const ENV_PATH = ".env.local";
const BACKUP_PATH = ".env.local.bak";
const PORT = 5180;
const BASE = `http://localhost:${PORT}`;
const PRODUCT = "5iSSGb6KR9XZMMJD9jcP";

const originalEnv = readFileSync(ENV_PATH, "utf8");

function setPaymentMethods(methods) {
  const cleaned = originalEnv
    .split("\n")
    .filter((line) => !line.startsWith("VITE_PAYMENT_METHODS="))
    .join("\n");
  writeFileSync(ENV_PATH, `${cleaned}\nVITE_PAYMENT_METHODS=${methods}\n`);
}

async function waitForServer(url, retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  throw new Error("Server did not start in time");
}

async function buildAndServe() {
  console.log("Building production bundle...");
  const build = spawn("npm", ["run", "build"], { shell: true, stdio: "inherit" });
  await new Promise((resolve, reject) => {
    build.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))));
  });

  console.log("Starting preview server...");
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    shell: true,
    stdio: "pipe",
    detached: true,
  });

  server.on("error", (err) => console.error("preview server error", err));

  await waitForServer(BASE);
  console.log(`Preview server ready at ${BASE}`);
  return server;
}

function killServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // ignore
    }
    server.on("close", resolve);
    setTimeout(() => resolve(), 2000);
  });
}

async function countPaymentMethods(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    (lines) => localStorage.setItem("temu-clone:cart", JSON.stringify(lines)),
    [{ productId: PRODUCT, qty: 1, selected: true, variation: undefined, addedAt: Date.now() }],
  );
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.waitForSelector("text=No shipping address yet", { timeout: 15000 }).catch(() => null);

  const bodyText = await page.locator("body").textContent();
  console.log("Checkout body (first 2000 chars):\n", bodyText.slice(0, 2000));

  const hasAddress = await page.locator("input[name='shipping-address']").count();
  if (hasAddress === 0) {
    await page.locator("button:has-text('Add shipping address')").first().click();
    await page.waitForSelector("form input[autocomplete='name']", { timeout: 10000 });
    await page.fill("input[autocomplete='name']", "Test User");
    await page.fill("input[autocomplete='tel']", "08012345678");
    await page.fill("input[autocomplete='email']", "test@example.com");
    await page.selectOption("select:below(:text('State'))", { label: "Lagos" }).catch(async () => {
      const selects = page.locator("form select");
      await selects.nth(1).selectOption({ label: "Lagos" });
    });
    await page.fill("input[autocomplete='address-level2']", "Ikeja");
    await page.fill("input[autocomplete='street-address']", "12 Test Close");
    await page.locator("form button[type=submit]:has-text('Save address')").click();
    await page.waitForSelector("input[name='shipping-address']", { timeout: 15000 });
  }

  const labels = await page.locator("fieldset label:has(input[name='payment-method'])").allTextContents();
  return labels;
}

async function runCase(methodsEnv, expectedLabels) {
  console.log(`\n--- Testing VITE_PAYMENT_METHODS=${methodsEnv} ---`);
  setPaymentMethods(methodsEnv);

  const server = await buildAndServe();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    const labels = await countPaymentMethods(page);
    console.log("Payment method labels found:", labels);
    const normalized = labels.map((l) => l.trim().split(/\s/)[0]);
    const ok =
      expectedLabels.length === labels.length &&
      expectedLabels.every((expected) => labels.some((label) => label.includes(expected)));
    if (!ok) {
      throw new Error(`Expected ${JSON.stringify(expectedLabels)} but got ${JSON.stringify(labels)}`);
    }
    console.log("PASS");
  } finally {
    await browser.close();
    await killServer(server);
  }
}

async function main() {
  try {
    writeFileSync(BACKUP_PATH, originalEnv);

    await runCase('["card"]', ["Debit or credit card"]);
    await runCase('["card","bank_transfer"]', ["Debit or credit card", "Bank transfer"]);

    console.log("\n=== All payment-method filter tests passed ===");
  } finally {
    writeFileSync(ENV_PATH, originalEnv);
    console.log("Restored original .env.local");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
