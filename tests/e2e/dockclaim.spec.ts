import path from "node:path";

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const SHOWCASE_EMAIL = "ops@dockclaim.dev";
const SHOWCASE_PASSWORD = "DockClaim123!";

async function signInToShowcaseWorkspace(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SHOWCASE_EMAIL);
  await page.getByLabel("Password").fill(SHOWCASE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test("demo user can import CSV, open a load, create a claim, and see an email draft", async ({ page }) => {
  await signInToShowcaseWorkspace(page);

  await page.goto("/app/imports");
  const csvPath = path.resolve(process.cwd(), "examples", "dockclaim-sample-loads.csv");
  await page.locator("input[type='file']").setInputFiles(csvPath);
  await page.getByRole("button", { name: /Import \d+ rows/ }).click();

  await page.goto("/app/loads");
  await page.getByRole("link", { name: "SAMPLE-1001" }).click();
  await page.getByRole("button", { name: "Create or update claim" }).click();

  await page.goto("/app/claims");
  const claimHref = await page.getByRole("link", { name: /DC-\d{4}-/ }).first().getAttribute("href");
  expect(claimHref).toBeTruthy();
  await page.goto(claimHref!);

  await expect(page.getByText("Email draft")).toBeVisible();
  await expect(page.getByText(/accessorial claim DC-\d{4}-\d{4}/i)).toBeVisible();
});

test("sidebar navigation shows pending feedback and a workspace skeleton before claims render", async ({
  page,
}) => {
  await page.route(/\/app\/claims(\?.*)?$/, async (route) => {
    await page.waitForTimeout(900);
    await route.continue();
  });

  await signInToShowcaseWorkspace(page);

  await page.locator('[data-sidebar-href="/app/claims"]').first().click();

  await expect(page.getByTestId("sidebar-link-pending")).toContainText("Claims");
  await expect(page.getByTestId("workspace-loading")).toBeVisible();
  await expect(page).toHaveURL(/\/app\/claims/);
  await expect(page.getByRole("heading", { name: "Claim queue from draft to paid." })).toBeVisible();
});
