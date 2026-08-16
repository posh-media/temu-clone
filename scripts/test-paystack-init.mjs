import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const PRODUCT = "5iSSGb6KR9XZMMJD9jcP";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const cartLines = [{ productId: PRODUCT, qty: 1, selected: true, variation: undefined, addedAt: Date.now() }];
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate((lines) => localStorage.setItem("temu-clone:cart", JSON.stringify(lines)), cartLines);

await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const hasAddress = await page.locator("input[name='shipping-address']").count();
if (hasAddress === 0) {
  await page.locator("button:has-text('Add shipping address')").first().click();
  await page.waitForSelector("form input[autocomplete='name']", { timeout: 10000 });
  await page.fill("input[autocomplete='name']", "Test User");
  await page.fill("input[autocomplete='tel']", "08012345678");
  await page.fill("input[autocomplete='email']", "test-paystack@example.com");
  await page.selectOption("select:below(:text('State'))", { label: "Lagos" }).catch(async () => {
    const selects = page.locator("form select");
    await selects.nth(1).selectOption({ label: "Lagos" });
  });
  await page.fill("input[autocomplete='address-level2']", "Ikeja");
  await page.fill("input[autocomplete='street-address']", "12 Test Close");
  await page.locator("form button[type=submit]:has-text('Save address')").click();
  await page.waitForSelector("input[name='shipping-address']", { timeout: 15000 });
}

// Select debit/credit card method and place order.
await page.locator("label:has-text('Debit or credit card')").first().click();
await page.locator("button:has-text('Place order')").first().click();
await page.waitForURL(/\/payment\?ref=ORD-TEMU-/, { timeout: 25000 });
await page.waitForSelector("text=Amount due", { timeout: 15000 });

// Ensure Paystack is selected (default).
const paystackLabel = page.locator("label:has-text('Paystack')").first();
if (await paystackLabel.isVisible().catch(() => false)) {
  await paystackLabel.click();
}

await page.waitForTimeout(500);

// Click Pay and capture the callable response.
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes("paystackInitialize"), { timeout: 20000 }),
  page.locator("button:has-text('Pay ')").first().click(),
]);

const resJson = await response.json();
console.log("paystackInitialize response:", JSON.stringify(resJson, null, 2));
console.log("Paystack initialized:", Boolean(resJson?.result?.data?.accessCode));

// The Paystack inline-js iframe may appear; just check it exists.
await page.waitForTimeout(3000);
const frame = page.locator("iframe[src*='paystack']").first();
console.log("Paystack iframe present:", await frame.isVisible().catch(() => false));
await browser.close();
