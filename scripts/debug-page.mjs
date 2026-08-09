import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => console.log(`console.${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.stack ?? e.message}`));
page.on("requestfailed", (r) => console.log(`REQFAIL: ${r.url()} :: ${r.failure()?.errorText}`));
page.on("response", (r) => {
  if (r.status() >= 400) console.log(`HTTP ${r.status()} ${r.url()}`);
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
const html = await page.content();
fs.writeFileSync("debug-page.html", html, "utf8");
console.log("---- text ----");
console.log((await page.locator("body").innerText()).slice(0, 2500));
await page.screenshot({ path: "debug-page.png", fullPage: false });
await browser.close();
