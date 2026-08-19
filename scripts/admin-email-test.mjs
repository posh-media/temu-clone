import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const ADMIN_EMAIL = "admin@temudemo.test";
const ADMIN_PASSWORD = "AdminDemo123!";
const ORDER_ID = process.argv[2];

if (!ORDER_ID) {
  console.error("Usage: node scripts/admin-email-test.mjs <orderId>");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on("console", (m) => { if (m.type() === "error") problems.push(m.text()); });
page.on("pageerror", (e) => problems.push(e.message));

console.log("login admin");
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByLabel("Email address").fill(ADMIN_EMAIL);
await page.getByLabel("Password").fill(ADMIN_PASSWORD);
await page.click("button[type=submit]");
await page.waitForURL(/\/account/, { timeout: 20000 });

console.log("open admin order detail");
await page.goto(`${BASE}/admin/orders/${ORDER_ID}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Resend email", { timeout: 15000 });

console.log("click resend email");
await page.click("button:has-text('Resend email')");
await page.waitForSelector("text=Send the order confirmation email to the customer?", { timeout: 5000 });

console.log("confirm send");
await page.getByRole("button", { name: "Send email", exact: true }).click();
await page.waitForSelector("text=Order email sent successfully", { timeout: 20000 });
console.log("email sent");

console.log("resend a second time");
await page.getByRole("button", { name: "Send email", exact: true }).click();
await page.waitForSelector("text=Order email sent successfully", { timeout: 20000 });
console.log("second email sent");

await page.screenshot({ path: "smoke-shots/admin-email-sent.png" });
await browser.close();

console.log("\n--- PROBLEMS ---");
console.log(problems.length ? problems.join("\n") : "none");
process.exit(problems.length ? 1 : 0);
