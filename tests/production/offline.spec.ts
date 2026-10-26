import { test, expect } from "@playwright/test";
import { mockScanHardware } from "../e2e/scan-helpers";
test("installed PWA reloads a previously visited contact book offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockScanHardware(page);
  await page.goto("/app");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.goto("/app/scan");
  await expect(
    page.getByText("Point at their QR. We’ll save the rest."),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__scanHarness.nextCode = "https://first-offline.example/builder";
  });
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await page.goto("/app/people");
  await expect(page.locator(".contact-card")).toHaveCount(1);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".contact-card")).toHaveCount(1);
  await expect(
    page.getByText("Offline · saved locally", { exact: true }),
  ).toBeVisible();
  await page.goto("/app/scan");
  await expect(
    page.getByText("Point at their QR. We’ll save the rest."),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__scanHarness.nextCode = "https://another-offline.example/builder";
  });
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.goto("/app/people");
  await page.reload();
  await expect(page.locator(".contact-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("landing loads without scanner, map tiles, or third-party avatar requests", async ({
  page,
  request,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      new URL(r.url()).origin !==
      new URL(test.info().project.use.baseURL!).origin
    )
      external.push(r.url());
  });
  const start = Date.now();
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Never lose a great conference connection again.",
    }),
  ).toBeVisible();
  const timing = await page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation")[0].toJSON(),
    bytes: performance
      .getEntriesByType("resource")
      .reduce(
        (sum, r) => sum + (r as PerformanceResourceTiming).transferSize,
        0,
      ),
  }));
  console.log(
    JSON.stringify({
      warmLandingMs: Date.now() - start,
      transferredBytes: timing.bytes,
      externalRequests: external.length,
    }),
  );
  expect(external).toEqual([]);
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const png = await request.get("/icon-192.png");
  expect(png.ok()).toBe(true);
});
