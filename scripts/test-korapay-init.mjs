import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const PRODUCT = "5iSSGb6KR9XZMMJD9jcP";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// Seed cart with one selected item.
const cartLines = [{ productId: PRODUCT, qty: 1, selected: true, variation: undefined, addedAt: Date.now() }];
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate((lines) => localStorage.setItem("temu-clone:cart", JSON.stringify(lines)), cartLines);

// Checkout flow.
await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

// Create address if none.
const hasAddress = await page.locator("input[name='shipping-address']").count();
console.log("hasAddress:", hasAddress);
if (hasAddress === 0) {
  const addBtn = page.locator("button:has-text('Add shipping address')").first();
  const visible = await addBtn.isVisible().catch(() => false);
  console.log("addBtn visible:", visible);
  if (!visible) {
    const bodyText = await page.locator("body").textContent();
    console.log("page body:\n", bodyText.slice(0, 2000));
  }
  await addBtn.click();
  await page.waitForSelector("form input[autocomplete='name']", { timeout: 10000 });
  await page.fill("input[autocomplete='name']", "Test User");
  await page.fill("input[type='tel']", "08012345678");
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

// Ensure card method selected, place order.
await page.locator("label:has-text('Debit or credit card')").first().click();
await page.locator("button:has-text('Place order')").first().click();
await page.waitForURL(/\/payment\?ref=ORD-TEMU-/, { timeout: 25000 });
await page.waitForSelector("text=Amount due", { timeout: 15000 });

// If provider picker shown, select KoraPay.
const korapayLabel = page.locator("label:has-text('KoraPay')").first();
if (await korapayLabel.isVisible().catch(() => false)) {
  await korapayLabel.click();
}

await page.waitForTimeout(500);
await page.locator("button:has-text('Pay ')").first().click();

// Wait for redirect to KoraPay checkout or redirecting UI.
const logs = [];
page.on("console", (msg) => logs.push(`${msg.type()}: ${msg.text()}`));

await page.waitForTimeout(8000);
console.log("current URL after clicking Pay:", page.url());
const outcome = await page.locator("main h2").first().textContent().catch(() => "");
console.log("outcome heading:", outcome);
console.log("console logs:\n", logs.join("\n"));

const isKoraPay = page.url().includes("korapay");
console.log("Redirected to KoraPay:", isKoraPay);

await browser.close();
