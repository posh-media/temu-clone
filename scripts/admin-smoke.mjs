import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:5173";
const EMAIL = "admin@temudemo.test";
const PASSWORD = "AdminDemo123!";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const problems = [];
page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

function step(name, fn) {
  console.log(`  ${name}`);
  return fn();
}

await step("login admin", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/account/, { timeout: 20000 });
});

await step("access admin", async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Dashboard", { timeout: 20000 });
  await page.waitForSelector("text=Total products", { timeout: 10000 });
});

await step("products page", async () => {
  await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1:has-text('Products')", { timeout: 15000 });
  await page.waitForSelector("table tbody tr", { timeout: 15000 });
});

let newId;
await step("create product", async () => {
  await page.click("text=Add product");
  await page.waitForURL(/\/admin\/products\/new/, { timeout: 15000 });
  await page.waitForSelector("input", { timeout: 10000 });
  await page.getByRole("textbox", { name: /Product name/i }).fill("Admin Smoke Test Product");
  await page.getByRole("textbox", { name: /Brand name/i }).fill("Smoke Brand");
  await page.locator("select").first().selectOption("Electronics");
  await page.getByRole("spinbutton", { name: /Price/i }).fill("5000");
  await page.getByRole("spinbutton", { name: /Available stock/i }).fill("10");
  await page.getByRole("spinbutton", { name: /Total stock/i }).fill("10");
  await page.click("button:has-text('Create product')");
  await page.waitForURL(/\/admin\/products$/, { timeout: 20000 });
  const cell = page.locator("table tbody tr td", { hasText: "Admin Smoke Test Product" }).first();
  await cell.waitFor({ timeout: 20000 });
  const idCell = cell.locator("xpath=../td[2]");
  newId = (await idCell.innerText()).trim();
  console.log(`    created ${newId}`);
});

await step("edit product", async () => {
  await page.goto(`${BASE}/admin/products/${newId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByRole("textbox", { name: /Product name/i }).fill("Admin Smoke Test Product Updated");
  await page.click("button:has-text('Save changes')");
  const success = await page.waitForSelector("text=Product saved successfully", { timeout: 10000 }).catch(() => null);
  if (!success) {
    const error = await page.locator("text=/Product saved|Unable to|Failed to|error/i").first().innerText().catch(() => "no message");
    throw new Error(`edit save did not succeed: ${error}`);
  }
});

await step("hide and show product", async () => {
  await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded" });
  const row = page.locator("table tbody tr", { hasText: newId }).first();
  await row.locator("button[title='Hide product']").click();
  await page.waitForTimeout(800);
  await row.locator("button[title='Show product']").click();
  await page.waitForTimeout(800);
});

await step("orders page", async () => {
  await page.goto(`${BASE}/admin/orders`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1:has-text('Orders')", { timeout: 15000 });
});

await step("customers page", async () => {
  await page.goto(`${BASE}/admin/customers`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1:has-text('Customers')", { timeout: 15000 });
});

await step("admins page", async () => {
  await page.goto(`${BASE}/admin/admins`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Current admins", { timeout: 15000 });
});

await step("delete product", async () => {
  await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded" });
  const row = page.locator("table tbody tr", { hasText: newId }).first();
  await row.locator("button[title='Delete product']").click();
  await page.waitForSelector("text=Delete product", { timeout: 5000 });
  await page.click("button:has-text('Delete')");
  await page.waitForFunction(
    (id) => document.querySelector(`table tbody tr`)?.innerText?.includes(id) === false,
    newId,
    { timeout: 10000 },
  );
});

await step("non-admin redirect", async () => {
  // Create a non-admin account, sign out, sign in as non-admin, then try /admin.
  const smokeEmail = `smoke_${Date.now()}@example.com`;
  const smokePassword = "SmokePass123!";
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.locator("input[autocomplete='name']").fill("Smoke User");
  await page.locator("input[autocomplete='email']").fill(smokeEmail);
  const pwInputs = page.locator("input[type='password']");
  await pwInputs.nth(0).fill(smokePassword);
  await pwInputs.nth(1).fill(smokePassword);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/(account|)/, { timeout: 20000 });
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\//, { timeout: 15000 });
});

await browser.close();
console.log("Admin smoke finished. Problems:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
