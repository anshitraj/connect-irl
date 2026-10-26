import { test, expect, type Page } from "@playwright/test";
import { mockScanHardware } from "../e2e/scan-helpers";
import AxeBuilder from "@axe-core/playwright";
async function enterEmail(page: Page, email: string) {
  await page.goto("/login");
  await page.getByText("Other ways to sign in", { exact: true }).click();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Email me a sign-in link", exact: true })
    .click();
  await expect(
    page.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
}
async function verify(page: Page) {
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page
    .getByRole("button", { name: "Verify & continue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app(?:\/profile)?$/, { timeout: 30000 });
}
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4401/_test/reset");
});
test("email ownership is verified, invalid codes fail, and returning members enter the app", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await enterEmail(page, "priya@example.com");
  await expect(
    page.getByRole("button", { name: /Resend email in/ }),
  ).toBeDisabled();
  await page.getByLabel("Verification code", { exact: true }).fill("999999");
  await page
    .getByRole("button", { name: "Verify & continue", exact: true })
    .click();
  await expect(page.locator(".auth-form .form-error")).toContainText(
    /expired|invalid/,
  );
  await verify(page);
  await expect(
    page.getByRole("heading", { name: /Good to see you, Priya/ }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/app$/);
});
test("a new verified email goes to three-step onboarding", async ({ page }) => {
  await enterEmail(page, "new-builder@example.com");
  await verify(page);
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(page.getByLabel("Onboarding step 1 of 3")).toBeVisible();
});
test("the other account receives a genuine synced connection and success animation while sharing QR", async ({
  browser,
  page,
}) => {
  await enterEmail(page, "priya@example.com");
  await verify(page);
  await expect(
    page.getByRole("heading", { name: /Good to see you, Priya/ }),
  ).toBeVisible();
  await page
    .locator(".app-header")
    .getByRole("button", { name: "My QR", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Scannable profile QR code" }),
  ).toBeVisible();
  const other = await browser.newContext({ baseURL: "http://localhost:4400" });
  const scanner = await other.newPage();
  await mockScanHardware(scanner);
  await enterEmail(scanner, "asha@example.com");
  await verify(scanner);
  await scanner.goto("/app/scan");
  await expect
    .poll(() => scanner.evaluate(() => window.__scanHarness.cameraCalls))
    .toBe(1);
  await scanner.evaluate(() => {
    window.__scanHarness.nextCode = `${location.origin}/u/priya-shah`;
  });
  await expect(
    scanner.getByText("Connection successful.", { exact: true }),
  ).toBeVisible();
  await expect(
    scanner.getByRole("heading", { name: "Priya Shah", exact: true }),
  ).toBeVisible();
  await expect(scanner.locator(".sync-label")).toContainText(
    "All changes synced",
    { timeout: 20000 },
  );
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/connections");
        const body = await response.json();
        return body.receipts?.[0]?.actor?.name;
      },
      { timeout: 20000 },
    )
    .toBe("Asha Rao");
  await page.bringToFront();
  await expect(
    page.getByRole("heading", { name: "A new connection!", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole("heading", {
      name: "Asha Rao connected with you.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("PRIVATE meeting context")).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page })
    .include(".incoming-success")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.map((item) => item.id)).toEqual([]);
  await scanner.screenshot({
    path: "test-results-auth/sender-success.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results-auth/recipient-success.png",
    fullPage: true,
  });
  await page
    .getByRole("dialog")
    .filter({
      has: page.getByRole("heading", {
        name: "A new connection!",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Close dialog" })
    .click();
  await other.close();
});
