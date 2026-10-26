import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("primary surfaces have no automated WCAG A/AA violations", async ({
  page,
}) => {
  for (const route of ["/", "/app", "/app/profile", "/app/scan", "/login"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    if (route === "/") {
      // Measure the completed UI, rather than a random frame of Motion's
      // staggered opacity entrance. Keep the contrast rule enabled.
      for (const selector of [
        ".hero-buttons",
        ".hero-phone",
        ".floating-profile",
        ".floating-saved",
      ]) {
        await expect(page.locator(selector)).toHaveCSS("opacity", "1");
      }
    } else if (route.startsWith("/app")) {
      await expect(
        page.locator(".page-skeleton, .card-skeleton-grid"),
      ).toHaveCount(0);
      await expect(page.locator("main h1")).toBeVisible();
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("nextjs-portal")
      .analyze();
    await writeFile(
      test
        .info()
        .outputPath(`axe-${route.replaceAll("/", "_") || "home"}.json`),
      JSON.stringify(results.violations, null, 2),
    );
    expect
      .soft(
        results.violations.map((v) => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes
            .slice(0, 4)
            .map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        route,
      )
      .toEqual([]);
  }
});
