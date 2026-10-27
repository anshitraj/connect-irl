import { test, expect } from "@playwright/test";
import { mockScanHardware } from "../e2e/scan-helpers";
import AxeBuilder from "@axe-core/playwright";
import { openLink, requestLink } from "./magic-link";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4401/_test/reset");
});
test("email links sign members in, bad links fail, and returning members enter the app", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await requestLink(page, "priya@example.com");
  await expect(
    page.getByRole("button", { name: /Resend email in/ }),
  ).toBeDisabled();
  await page.goto("/auth/confirm?token_hash=not_a_valid_link_token");
  await expect(page).toHaveURL(/\/login\?error=expired/);
  await expect(page.locator(".auth-form .form-error")).toContainText(
    /sign-in link expired/,
  );
  await openLink(page, "priya@example.com");
  await expect(
    page.getByRole("heading", { name: /Good to see you, Priya/ }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/app$/);
});
test("a new verified email goes to five-step onboarding", async ({ page }) => {
  await requestLink(page, "new-builder@example.com");
  await openLink(page, "new-builder@example.com");
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(page.getByLabel("Onboarding step 1 of 5")).toBeVisible();
  await expect(page.locator(".app-sidebar")).toHaveCount(0);
});
test("the other account receives a genuine synced connection and success animation while sharing QR", async ({
  browser,
  page,
}) => {
  await requestLink(page, "priya@example.com");
  await openLink(page, "priya@example.com");
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
  await requestLink(scanner, "asha@example.com");
  await openLink(scanner, "asha@example.com");
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
  // Scan once, both connected: the person who was scanned saves the scanner back.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const key = Object.keys(localStorage).find((key) =>
            /^buildermatch\.user\..+\.v1$/.test(key),
          )!;
          return JSON.parse(localStorage.getItem(key)!).contacts.map(
            (contact: { name: string }) => contact.name,
          );
        }),
      { timeout: 20000 },
    )
    .toEqual(["Asha Rao"]);
  await expect(
    page.getByText("They’re saved to your people too. Your notes stay private."),
  ).toBeVisible();
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
