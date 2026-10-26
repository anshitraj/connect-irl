import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("event artwork loads locally and saved-event filtering persists", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/app/events");
  const cards = page.locator(".directory-event");
  await expect(cards).toHaveCount(4);
  // ETHGlobal has no self-hosted organizer logo, so its artwork uses text.
  const logos = page.locator(".directory-event .conference-art img");
  await expect(logos).toHaveCount(3);
  await expect
    .poll(() =>
      logos.evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0 &&
            image.getAttribute("src")?.startsWith("/brands/"),
        ),
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Bookmark Devcon 8 India", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bookmark Devcon 8 India", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Saved events/ }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Devcon 8 India");
  await page.reload();
  await page.getByRole("button", { name: /Saved events/ }).click();
  await expect(cards).toHaveCount(1);
  await page
    .getByRole("button", { name: "Bookmark Devcon 8 India", exact: true })
    .click();
  await expect(
    page.getByText("Your event shortlist starts here."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all events" }).click();
  await expect(cards).toHaveCount(4);
  await page.getByLabel("Find an event or venue").fill("no-such-venue");
  await expect(page.getByText("No events match, yet.")).toBeVisible();
  await page.getByRole("button", { name: "Show all events" }).click();
  await expect(cards).toHaveCount(4);
  await expect
    .poll(() =>
      page
        .locator(".directory-events")
        .evaluate(
          (node) =>
            node
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === "running").length,
        ),
    )
    .toBe(0);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("heading", { name: "One city. So many possibilities." })
    .click();
  await page.screenshot({
    path: `test-results/events-polished-${test.info().project.name}.png`,
    fullPage: true,
  });
  await cards
    .first()
    .getByRole("link", { name: "Event details", exact: true })
    .click();
  await expect(page.locator(".event-detail-brand img")).toHaveAttribute(
    "src",
    "/brands/devcon.png",
  );
  await expect(
    page.getByRole("heading", { name: "Devcon 8 India", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("dashboard event logos remain legible with motion disabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app");
  const cards = page.locator(".compact-event");
  await expect(cards).toHaveCount(4);
  await cards.last().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".compact-event .conference-art img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page
      .locator(".workspace-scene")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  expect(
    await cards
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".scan-target > span")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  for (const card of await cards.all()) {
    expect(
      await card
        .locator("h3")
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    ).toBeGreaterThanOrEqual(14);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/dashboard-polished-${test.info().project.name}.png`,
    fullPage: true,
  });
});
