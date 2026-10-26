import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4401/_test/reset");
});
async function begin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByText("Other ways to sign in", { exact: true }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("new-profile@example.com");
  await page
    .getByRole("button", { name: "Email me a sign-in link", exact: true })
    .click();
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page
    .getByRole("button", { name: "Verify & continue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/profile$/, { timeout: 30000 });
}
test("multiple roles reveal only relevant details, photo previews auto-fill, and the finished profile persists", async ({
  page,
}) => {
  let xLookups = 0;
  let companyLookups = 0;
  const avatar =
    "https://pbs.twimg.com/profile_images/123/new_founder_normal.jpg";
  const logo =
    "https://fixture.supabase.co/storage/v1/object/public/avatars/company.png";
  await page.route(avatar, (route) =>
    route.fulfill({
      path: "public/avatars/priya.jpg",
      contentType: "image/jpeg",
    }),
  );
  await page.route(logo, (route) =>
    route.fulfill({ path: "public/icon-192.png", contentType: "image/png" }),
  );
  await page.route("**/api/profile-lookup", async (route) => {
    const body = route.request().postDataJSON();
    if (body.provider === "x") {
      xLookups++;
      await route.fulfill({ json: { handle: body.handle, avatar } });
    } else {
      companyLookups++;
      await route.fulfill({ json: { logo } });
    }
  });
  await begin(page);
  await expect(page.getByLabel("Username", { exact: true })).toHaveCount(0);
  await page.getByLabel("Your name", { exact: true }).fill("Asha Builder");
  await page
    .getByRole("button", { name: "Crypto enthusiast", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("GitHub", { exact: true })).not.toBeVisible();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Engineer", exact: true }).click();
  await page.getByRole("button", { name: "Founder", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Crypto enthusiast", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("GitHub", { exact: true })).toBeVisible();
  await page.getByLabel("X / Twitter", { exact: true }).fill("@new_founder");
  await expect(page.locator(".setup-social-photo img")).toHaveAttribute(
    "src",
    avatar,
  );
  await page.getByLabel("Business name", { exact: true }).fill("Rail Labs");
  await page
    .getByLabel("Designation", { exact: true })
    .fill("Co-founder & CTO");
  await page
    .getByLabel("Company website or LinkedIn", { exact: true })
    .fill("https://rail.example.com");
  await expect(page.locator(".company-preview img")).toHaveAttribute(
    "src",
    logo,
  );
  const axe = await new AxeBuilder({ page })
    .include(".simple-onboarding")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page
    .locator(".setup-social-photo")
    .evaluate((node) =>
      node.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  await page.screenshot({
    path: `test-results-auth/onboarding-links-${test.info().project.name}.png`,
  });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose India Blockchain Week", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator(".sync-label")).toContainText(
    "All changes synced",
    { timeout: 15000 },
  );
  const profile = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) =>
      /^buildermatch\.user\..+\.v1$/.test(key),
    )!;
    return JSON.parse(localStorage.getItem(key)!).profile;
  });
  expect(profile.roles).toEqual(["Crypto enthusiast", "Engineer", "Founder"]);
  expect(profile.avatar).toBe(avatar);
  expect(profile.company).toMatchObject({
    name: "Rail Labs",
    designation: "Co-founder & CTO",
    website: "https://rail.example.com/",
    logo,
  });
  expect(profile.links).toEqual([
    { label: "X", url: "https://x.com/new_founder" },
  ]);
  expect(xLookups).toBe(1);
  expect(companyLookups).toBe(1);
  await page.goto(`/u/${profile.username}`);
  await expect(page.locator(".profile-role-tags")).toContainText("Engineer");
  await expect(page.locator(".public-company-card")).toContainText("Rail Labs");
  await expect(page.locator(".public-company-card img")).toHaveAttribute(
    "src",
    logo,
  );
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Edit profile & links/ }).click();
  await expect(page.locator(".setup-progress")).toHaveCount(0);
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Rail Labs",
  );
});
test("photo lookup and image failures never block finishing with optional links left blank", async ({
  page,
}) => {
  const brokenPhoto = "https://pbs.twimg.com/profile_images/123/broken.jpg";
  await page.route(brokenPhoto, (route) => route.fulfill({ status: 404 }));
  await page.route("**/api/profile-lookup", (route) =>
    route.request().postDataJSON().handle === "broken_picture" ? route.fulfill({ json: { handle: "broken_picture", avatar: brokenPhoto } }) : route.fulfill({
      status: 503,
      json: {
        error:
          "X photo lookup isn’t configured yet. You can continue without a photo.",
      },
    }),
  );
  await begin(page);
  await page.getByLabel("Your name", { exact: true }).fill("New Designer");
  await page.getByRole("button", { name: "Designer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("X / Twitter", { exact: true }).fill("new_designer");
  await expect(
    page.getByText(/You can continue without a photo/),
  ).toBeVisible();
  await page.getByLabel("X / Twitter", { exact: true }).fill("broken_picture");
  await expect(page.getByText("Using your initials for now. You can add a photo later.", { exact: true })).toBeVisible();
  await expect(page.locator(".setup-social-photo img")).toHaveCount(0);
  await expect(page.getByLabel("GitHub", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Not attending an event yet", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
});
test("a late response for a previous X handle cannot replace the current photo", async ({ page }) => {
  const currentPhoto = "https://pbs.twimg.com/profile_images/123/current.jpg";
  const previousPhoto = "https://pbs.twimg.com/profile_images/123/previous.jpg";
  await page.route("https://pbs.twimg.com/**", (route) => route.fulfill({ path: "public/avatars/priya.jpg", contentType: "image/jpeg" }));
  let completed: () => void = () => {};
  const previousCompleted = new Promise<void>((resolve) => { completed = resolve; });
  await page.route("**/api/profile-lookup", async (route) => {
    const handle = route.request().postDataJSON().handle;
    if (handle === "previous_user") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try { await route.fulfill({ json: { handle, avatar: previousPhoto } }); } catch { /* The browser canceled this stale request. */ } finally { completed(); }
    } else await route.fulfill({ json: { handle, avatar: currentPhoto } });
  });
  await begin(page);
  await page.getByLabel("Your name", { exact: true }).fill("New Builder");
  await page.getByRole("button", { name: "Builder", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const previousRequest = page.waitForRequest((request) => request.url().endsWith("/api/profile-lookup") && request.postDataJSON().handle === "previous_user");
  await page.getByLabel("X / Twitter", { exact: true }).fill("previous_user");
  await previousRequest;
  await page.getByLabel("X / Twitter", { exact: true }).fill("current_user");
  await expect(page.locator(".setup-social-photo img")).toHaveAttribute("src", currentPhoto);
  await previousCompleted;
  await expect(page.locator(".setup-social-photo img")).toHaveAttribute("src", currentPhoto);
});
