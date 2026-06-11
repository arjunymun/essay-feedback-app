import { chromium } from "@playwright/test";
import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.PORTFOLIO_CAPTURE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve("docs", "demo-assets");

async function saveVideo(page, outputName) {
  const video = page.video();
  await page.close();
  if (!video) {
    return;
  }
  await rename(await video.path(), path.join(outputDir, outputName));
}

async function captureDesktop(browser) {
  const context = await browser.newContext({
    recordVideo: { dir: outputDir, size: { width: 1440, height: 1000 } },
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.screenshot({ path: path.join(outputDir, "homepage-desktop.png"), fullPage: true });
  await page.locator(".marketing-3d-section").scrollIntoViewIfNeeded();
  await page.mouse.move(1050, 470);
  await page.waitForTimeout(900);
  await page.mouse.move(820, 620);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outputDir, "homepage-3d.png"), fullPage: false });
  await saveVideo(page, "homepage-3d.webm");
  await context.close();
}

async function captureReport(browser) {
  const context = await browser.newContext({
    recordVideo: { dir: outputDir, size: { width: 1440, height: 1000 } },
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/dashboard/submissions/demo-report`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, "sample-report-desktop.png"), fullPage: true });
  await page.mouse.wheel(0, 620);
  await page.waitForTimeout(650);
  await page.mouse.wheel(0, 720);
  await page.waitForTimeout(650);
  await page.mouse.wheel(0, 720);
  await page.waitForTimeout(650);
  await saveVideo(page, "sample-report-scroll.webm");
  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({
    isMobile: true,
    recordVideo: { dir: outputDir, size: { width: 390, height: 844 } },
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.screenshot({ path: path.join(outputDir, "homepage-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(outputDir, "homepage-mobile-menu.png"), fullPage: false });
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(700);
  await saveVideo(page, "homepage-mobile.webm");
  await context.close();
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();

try {
  await captureDesktop(browser);
  await captureReport(browser);
  await captureMobile(browser);
} finally {
  await browser.close();
}

console.log(`Captured portfolio assets in ${outputDir}`);
