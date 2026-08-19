import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const userA = { email: `addrA_${Date.now()}@example.com`, password: "AddrTest123!", name: "User A" };
const userB = { email: `addrB_${Date.now()}@example.com`, password: "AddrTest123!", name: "User B" };

async function signup(page, user) {
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.locator("input[autocomplete='name']").fill(user.name);
  await page.locator("input[autocomplete='email']").fill(user.email);
  const pw = page.locator("input[type='password']");
  await pw.nth(0).fill(user.password);
  await pw.nth(1).fill(user.password);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/account/, { timeout: 20000 });
}

async function addToCartAndCheckout(page) {
  await page.goto(`${BASE}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("article a[href^='/product/']", { timeout: 20000 });
  const href = await page.locator("article a[href^='/product/']").first().getAttribute("href");
  await page.goto(BASE + href, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button:has-text('Add to cart'):visible", { timeout: 15000 });
  await page.locator("button:has-text('Add to cart'):visible").first().click();
  await page.waitForSelector("text=/added to cart/i", { timeout: 10000 });
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await page.click("button:has-text('Checkout'):visible");
  await page.waitForURL(/\/checkout/, { timeout: 15000 });
}

async function saveAddressAtCheckout(page, label = "12 Test Close") {
  await page.click("button:has-text('Add shipping address')");
  await page.waitForSelector("form input[autocomplete='name']", { timeout: 10000 });
  await page.fill("input[autocomplete='name']", "Address Tester");
  await page.fill("input[autocomplete='tel']", "+234 800 000 0000");
  await page.fill("input[autocomplete='email']", page.url().includes("addrA") ? userA.email : userB.email);
  const selects = page.locator("form select");
  await selects.nth(1).selectOption({ label: "Lagos" });
  await page.fill("input[autocomplete='address-level2']", "Ikeja");
  await page.fill("input[autocomplete='street-address']", label);
  await page.click("form button[type=submit]:has-text('Save address')");
  await page.waitForSelector(`text=${label}`, { timeout: 10000 });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const problems = [];
page.on("console", (m) => { if (m.type() === "error") problems.push(m.text()); });
page.on("pageerror", (e) => problems.push(e.message));

console.log("TEST 1: signed-in user saves address at checkout");
await signup(page, userA);
await addToCartAndCheckout(page);
await saveAddressAtCheckout(page, "12 Test Close");
console.log("  address saved and shown");

console.log("TEST 2: reload checkout, saved address persists");
await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
await page.click("button:has-text('Checkout'):visible");
await page.waitForURL(/\/checkout/, { timeout: 15000 });
await page.waitForSelector("text=12 Test Close", { timeout: 10000 });
console.log("  address persisted");

console.log("TEST 3: place order with saved address");
await page.locator("label:has-text('Pay on delivery')").first().click();
await page.locator("button:has-text('Place order')").first().click();
await page.waitForURL(/\/payment\?ref=ORD-TEMU-/, { timeout: 25000 });
const orderUrl = page.url();
const orderRef = new URL(orderUrl).searchParams.get("ref");
console.log(`  order placed: ${orderRef}`);

console.log("TEST 4: order detail shows original address snapshot");
await page.goto(`${BASE}/orders/${orderRef}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=12 Test Close", { timeout: 15000 });
console.log("  order has original address");

console.log("TEST 5: modify saved address, order snapshot unchanged");
await page.goto(`${BASE}/address`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=12 Test Close", { timeout: 10000 });
await page.click("button:has-text('Edit')");
await page.waitForSelector("form input[autocomplete='street-address']", { timeout: 5000 });
await page.fill("input[autocomplete='street-address']", "99 Changed Street");
await page.click("form button[type=submit]:has-text('Save address')");
await page.waitForSelector("text=99 Changed Street", { timeout: 10000 });
await page.goto(`${BASE}/orders/${orderRef}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Shipping to", { timeout: 15000 });
const hasOriginal = await page.locator("text=12 Test Close").count() > 0;
if (!hasOriginal) throw new Error("order snapshot changed after address update");
console.log("  order snapshot unchanged");

console.log("TEST 6: sign out, attempt to access address page");
await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
const signOut = await page.locator("button:has-text('Sign out'), a:has-text('Sign out')").first();
if (await signOut.count()) {
  await signOut.click();
  await page.waitForURL(/\//, { timeout: 10000 });
}
await page.goto(`${BASE}/address`, { waitUntil: "domcontentloaded" });
const guestBody = await page.locator("body").innerText();
if (guestBody.includes("Sign in") || guestBody.includes("Sign up")) {
  console.log("  signed-out user sees auth prompt");
} else {
  console.log("  note: address page may still render guest addresses");
}

console.log("TEST 7: user B cannot see user A addresses");
const pageB = await context.newPage();
await signup(pageB, userB);
await pageB.goto(`${BASE}/address`, { waitUntil: "domcontentloaded" });
await pageB.waitForSelector("text=No saved addresses", { timeout: 10000 });
const bBody = await pageB.locator("body").innerText();
if (bBody.includes("99 Changed Street")) throw new Error("User B saw User A address");
console.log("  user B address book is empty");

await browser.close();
console.log("\n--- PROBLEMS ---");
console.log(problems.length ? problems.join("\n") : "none");
process.exit(problems.length ? 1 : 0);
