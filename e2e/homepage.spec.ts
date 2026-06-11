import { expect, test } from "@playwright/test";

test("homepage presents the trust-first product story", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /evidence-grounded document review/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /explore workspace/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /view sample report/i })).toBeVisible();
  await expect(page.getByText("Claim-level findings")).toBeVisible();
  await expect(page.getByText("Verifier pass")).toBeVisible();
});

test("homepage renders the 3d provenance canvas", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas[data-testid='trust-orbit-canvas']");
  await expect(canvas).toBeVisible();

  const hasPaintedPixels = await canvas.evaluate((node) => {
    const source = node as HTMLCanvasElement;
    const target = document.createElement("canvas");
    target.width = source.width;
    target.height = source.height;
    const context = target.getContext("2d");
    if (!context) {
      return false;
    }

    context.drawImage(source, 0, 0);
    const { data } = context.getImageData(0, 0, target.width, target.height);
    let painted = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] > 12) {
        painted += 1;
        if (painted > 80) {
          return true;
        }
      }
    }
    return false;
  });

  expect(hasPaintedPixels).toBe(true);
});

test("homepage mobile navigation opens and exposes primary links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation" });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toBeEnabled();
  await menuButton.click();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();

  await expect(page.getByRole("link", { name: "Product" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Trust" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});
