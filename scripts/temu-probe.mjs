/**
 * Probe Temu public product page accessibility.
 * Uses Playwright with a normal desktop UA, waits for hydration, then reports
 * whether product data is present or blocked.
 */
import { chromium } from "playwright";

const URL = "https://www.temu.com/goods-detail-g-601099607861548.html";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  viewport: { width: 1366, height: 768 },
});
const page = await context.newPage();

try {
  const response = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("HTTP status:", response?.status());

  // Give JS a chance to hydrate product data.
  await page.waitForTimeout(8000);

  const title = await page.title();
  console.log("Page title:", title);

  const text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const blocked = /robot|captcha|blocked|access denied|verify|security check/i.test(text);
  console.log("Blocked signals:", blocked);

  // Look for likely product data in page text.
  const priceMatch = text.match(/\$[\d,.]+/);
  const imageCount = await page.locator('img[src*="kwcdn.com"]').count().catch(() => 0);

  console.log("Price-like text:", priceMatch?.[0] ?? "none");
  console.log("Temu CDN images:", imageCount);

  if (blocked) {
    console.log("RESULT: Temu is blocking automated browser access.");
  } else if (text.length < 300 || !priceMatch) {
    console.log("RESULT: Page loaded but product data did not hydrate in headless mode.");
  } else {
    console.log("RESULT: Page appears to expose product content.");
  }
} catch (err) {
  console.log("ERROR:", err.message);
} finally {
  await browser.close();
}
