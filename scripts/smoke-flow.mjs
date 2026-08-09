/**
 * End-to-end smoke test of the core shopping journey:
 *   Home -> Search -> Product -> Add to cart -> Cart -> Checkout -> Address -> Payment
 *
 * Also collects every console error / page error and screenshots each step at
 * desktop and mobile widths.  Run against a dev or preview server:
 *   node scripts/smoke-flow.mjs http://localhost:5173
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = "smoke-shots";

// "domcontentloaded" is more reliable than "networkidle" for an SPA that is
// still resolving product images from third-party hosts.
const NAV_WAIT = "domcontentloaded";
fs.mkdirSync(OUT, { recursive: true });

const problems = [];
const steps = [];

const browser = await chromium.launch();

async function run(label, width, height, isMobile) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`[${label}] console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[${label}] pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    // Third-party product image hosts are expected to fail sometimes.
    if (req.resourceType() === "image") return;
    // Aborted requests are normal when a page navigates away or a listener closes.
    if (req.failure()?.errorText?.includes("ERR_ABORTED")) return;
    problems.push(`[${label}] requestfailed: ${req.url()} ${req.failure()?.errorText}`);
  });

  const shot = async (name) => {
    await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: false });
  };
  const note = (msg) => {
    steps.push(`[${label}] ${msg}`);
    console.log(`  [${label}] ${msg}`);
  };

  // ---- Home ----
  await page.goto(BASE, { waitUntil: NAV_WAIT });
  await page.waitForSelector("article a[href^='/product/']", { timeout: 20000 });
  const homeCards = await page.locator("article a[href^='/product/']").count();
  const homeProductHref = await page.locator("article a[href^='/product/']").first().getAttribute("href");
  note(`home rendered with ${homeCards} product links`);
  await shot("1-home");

  // ---- Search ----
  // The mobile and desktop headers both mount the search box; pick the visible one.
  const searchInput = page.locator("#site-search:visible");
  await searchInput.fill("jbl");
  await searchInput.press("Enter");
  await page.waitForURL(/\/search\?q=jbl/, { timeout: 15000 });
  await page.waitForSelector("h1", { timeout: 15000 });
  const resultText = await page.locator("main h1").first().innerText();
  const resultCount = await page.locator("article a[href^='/product/']").count();
  note(`search "${resultText.trim()}" -> ${resultCount} results`);
  await shot("2-search");

  // Sorting still returns results.
  await page.goto(`${BASE}/search?sort=price-asc`, { waitUntil: NAV_WAIT });
  await page.waitForSelector("article a[href^='/product/']");
  note(`sort=price-asc -> ${await page.locator("article a[href^='/product/']").count()} results`);

  // Filter by category from the URL.
  await page.goto(`${BASE}/search?category=Fashion`, { waitUntil: NAV_WAIT });
  await page.waitForSelector("article a[href^='/product/']");
  note(`category=Fashion -> ${await page.locator("article a[href^='/product/']").count()} results`);
  await shot("3-search-filtered");

  // Empty state.
  await page.goto(`${BASE}/search?q=zzzznotathing`, { waitUntil: NAV_WAIT });
  await page.waitForSelector("text=/No results for/i", { timeout: 15000 });
  note("empty search state renders");

  // ---- Product ----
  // The home product href was already captured at the start.
  await page.goto(BASE + (homeProductHref ?? "/"), { waitUntil: NAV_WAIT });
  await page.waitForSelector("main h1", { timeout: 15000 });
  const title = await page.locator("main h1").first().innerText();
  note(`PDP: "${title.slice(0, 60)}"`);
  await shot("4-product");

  // ---- Add to cart ----
  // Dismiss any auto-open flash sale modal first so the action reaches the page.
  const flashModalClose = page.locator("button:has-text('Continue browsing')");
  if (await flashModalClose.isVisible().catch(() => false)) {
    await flashModalClose.click();
  }
  await page.locator("button:has-text('Add to cart'):visible").first().click();
  await page.waitForSelector("text=/added to cart/i", { timeout: 10000 });
  note("add to cart toast shown");

  // ---- Cart ----
  await page.goto(`${BASE}/cart`, { waitUntil: NAV_WAIT });
  await page.waitForSelector("text=Shopping cart", { timeout: 15000 });
  const cartLines = await page.locator("main ul li input[type=checkbox]").count();
  note(`cart shows ${cartLines} line(s)`);
  await shot("5-cart");

  // ---- Checkout ----
  await page.locator("button:has-text('Checkout'):visible").first().click();
  await page.waitForURL(/\/checkout/, { timeout: 15000 });
  await page.waitForSelector("text=Shipping address", { timeout: 15000 });
  note("checkout reached");
  await shot("6-checkout");

  // ---- Address (created inside checkout) ----
  const hasAddress = await page.locator("input[name='shipping-address']").count();
  if (hasAddress === 0) {
    await page.locator("button:has-text('Add shipping address')").first().click();
    await page.waitForSelector("form input[autocomplete='name']", { timeout: 10000 });
    await page.fill("input[autocomplete='name']", "Smoke Tester");
    await page.fill("input[autocomplete='tel']", "+234 800 000 0000");
    await page.fill("input[autocomplete='email']", "smoke@example.com");
    await page.selectOption("select:below(:text('State'))", { label: "Lagos" }).catch(async () => {
      const selects = page.locator("form select");
      await selects.nth(1).selectOption({ label: "Lagos" });
    });
    await page.fill("input[autocomplete='address-level2']", "Ikeja");
    await page.fill("input[autocomplete='street-address']", "12 Test Close, Allen Avenue");
    await page.locator("form button[type=submit]:has-text('Save address')").click();
    await page.waitForSelector("input[name='shipping-address']", { timeout: 15000 });
    note("address created via checkout form");
  } else {
    note(`address already present (${hasAddress})`);
  }
  await shot("7-checkout-with-address");

  // ---- Place order -> Payment ----
  await page.locator("button:has-text('Place order')").first().click();
  await page.waitForURL(/\/payment\?ref=ORD-TEMU-/, { timeout: 25000 });
  await page.waitForSelector("text=Amount due", { timeout: 15000 });
  const ref = new URL(page.url()).searchParams.get("ref");
  note(`order created: ${ref}`);
  await shot("8-payment");

  // ---- Pay ----
  await page.locator("button:has-text('Pay ')").first().click();
  await page.waitForSelector("text=/Payment successful|Payment pending|Payment failed/", { timeout: 25000 });
  const outcome = await page.locator("main h2").first().innerText();
  note(`payment outcome: ${outcome}`);
  await shot("9-payment-result");

  // ---- Order detail ----
  await page.goto(`${BASE}/orders/${ref}`, { waitUntil: NAV_WAIT });
  await page.waitForSelector(`text=${ref}`, { timeout: 15000 });
  note("order detail page renders");
  await shot("10-order-detail");

  // ---- Supporting pages ----
  for (const [path, marker] of [
    ["/favorites", "Your favorites"],
    ["/address", "Your addresses"],
    ["/orders", "Your orders"],
    ["/login", "Sign in"],
    ["/signup", "Create your account"],
    ["/definitely-not-a-page", "doesn't exist"],
  ]) {
    await page.goto(BASE + path, { waitUntil: NAV_WAIT });
    await page.waitForSelector(`text=${marker}`, { timeout: 15000 });
    note(`${path} ok`);
  }
  await shot("11-notfound");

  await context.close();
}

console.log("Desktop pass (1440x900)");
await run("desktop", 1440, 900, false);
console.log("Mobile pass (390x844)");
await run("mobile", 390, 844, true);

await browser.close();

console.log("\n--- STEPS ---");
steps.forEach((s) => console.log(s));
console.log("\n--- PROBLEMS ---");
if (problems.length === 0) console.log("none");
else [...new Set(problems)].forEach((p) => console.log(p));
process.exit(problems.length ? 1 : 0);
