import { test, expect } from "@playwright/test";
test("real MapLibre worker, vector tiles, and verified venue pins render", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const worker = page.waitForResponse(
    (r) => r.url().endsWith("/vendor/maplibre-gl-worker.mjs") && r.ok(),
  );
  const tile = page.waitForResponse(
    (r) =>
      r.url().includes("tiles.openfreemap.org") &&
      r.url().includes(".pbf") &&
      r.ok(),
    { timeout: 30000 },
  );
  await page.goto("/app/map");
  await worker;
  await tile;
  await expect(page.locator(".venue-marker")).toHaveCount(3);
  await expect(page.locator(".map-error")).toHaveCount(0, { timeout: 20000 });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const canvas = page.locator(".real-map");
    const credits = page.locator(".maplibregl-ctrl-attrib");
    const caption = page.locator(".map-privacy-caption");
    await expect(
      credits.getByRole("link", { name: "OpenStreetMap", exact: true }),
    ).toBeVisible();
    const bounds = await canvas.boundingBox();
    const creditBounds = await credits.boundingBox();
    const captionBounds = await caption.boundingBox();
    expect(creditBounds!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
    expect(captionBounds!.y).toBeGreaterThanOrEqual(
      creditBounds!.y + creditBounds!.height,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".real-map")).toHaveCount(0);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".venue-marker")).toHaveCount(3);
  await expect(page.locator(".maplibregl-ctrl-attrib")).toHaveCount(1);
  await expect(
    page
      .getByRole("group", { name: "Map credits" })
      .getByRole("link", { name: "OpenStreetMap", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Devcon 8 India", exact: true })
    .click();
  await expect(page.locator(".venue-popup")).toContainText(
    "Jio World Convention Centre",
  );
  await page.screenshot({
    path: test.info().outputPath("live-venue-map.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
