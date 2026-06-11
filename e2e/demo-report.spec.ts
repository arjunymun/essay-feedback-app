import { expect, test } from "@playwright/test";

test("demo report shows trust-first findings and trace", async ({ page }) => {
  await page.goto("/dashboard/submissions/demo-report");

  await expect(page.getByRole("heading", { name: /Climate Adaptation/i })).toBeVisible();
  await expect(page.getByText("Trust layer")).toBeVisible();
  await expect(page.getByText("Claim-level review")).toBeVisible();
  await expect(page.getByText("unsupported", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Review trace")).toBeVisible();
});
