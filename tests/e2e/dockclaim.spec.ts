import path from "node:path";

import { expect, test } from "@playwright/test";

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

test("demo user can import CSV, open a load, create a claim, and see an email draft", async ({ page, context }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue in demo mode" })).toBeVisible();

  await context.addCookies([
    {
      name: "dockclaim-demo-user",
      value: DEMO_USER_ID,
      url: "http://127.0.0.1:3000",
    },
  ]);

  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard/);

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
